import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAIConnection } from '../app/lib/business-os/ai-connection.ts';

test('connection diagnostic stays read-only and never returns secret-bearing errors', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.AI_OS_MODEL;
  try {
    delete process.env.OPENAI_API_KEY;
    globalThis.fetch = async () => { throw Error('must not fetch without a key'); };
    assert.equal((await checkAIConnection()).status, 'credential_missing');
    process.env.OPENAI_API_KEY = 'test-secret-never-return';
    globalThis.fetch = async () => new Response('test-secret-never-return', { status: 401 });
    const denied = await checkAIConnection();
    assert.equal(denied.status, 'authentication_rejected');
    assert.ok(!JSON.stringify(denied).includes('test-secret-never-return'));
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/models');
      assert.equal(options.method, undefined);
      assert.equal(options.body, undefined);
      assert.equal(options.redirect, 'error');
      return Response.json({ data: [{ id: 'gpt-test' }, { id: 'ft:private-customer-model' }] });
    };
    process.env.AI_OS_MODEL = 'gpt-test';
    const verified = await checkAIConnection();
    assert.equal(verified.status, 'model_list_verified');
    assert.deepEqual(verified.availableGPTModels, ['gpt-test']);
    assert.equal(verified.configuredModelAvailable, true);
    globalThis.fetch = async () => { throw Error('test-secret-never-return'); };
    assert.ok(!JSON.stringify(await checkAIConnection()).includes('test-secret-never-return'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.AI_OS_MODEL; else process.env.AI_OS_MODEL = originalModel;
  }
});
