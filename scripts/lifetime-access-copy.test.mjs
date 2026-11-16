import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('Lifetime surfaces share independent permanent-access clarification', () => {
  for (const path of ['app/page.tsx', 'app/black-friday/page.tsx', 'app/lifetime-setup/page.tsx']) {
    assert.match(read(path), /<LifetimeAccessNote \/>/);
  }
  const note = read('app/components/lifetime-access-note.tsx');
  assert.match(note, /access has no expiration/);
  assert.match(note, /Uploading or renaming your private copy is optional/);
  assert.match(note, /even if you never upload or rename/);
  assert.match(note, /Existing purchases retain/);
  assert.match(note, /not separate standalone scripts/);
});
test('guide does not impose personal-use terms retroactively', () => {
  const guide = read('app/lifetime-setup/page.tsx');
  assert.match(guide, /For a personal-use source license/);
  assert.match(guide, /Existing buyers retain any different license rights promised at purchase/);
  assert.match(guide, /Optionally rename your private copy/);
});
