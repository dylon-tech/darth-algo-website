import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySupport,categoryNeedsFounder} from '../app/lib/business-os/support-classifier.ts';

test('support routing uses deterministic safe categories',()=>{
 assert.equal(classifySupport('Need access','I cannot add the indicator to TradingView'),'ACCESS');
 assert.equal(classifySupport('Card declined','My payment failed'),'FAILED_PAYMENT');
 assert.equal(classifySupport('Refund','Please refund the last charge'),'REFUND');
 assert.equal(classifySupport('Collaboration','Would you like a partnership?'),'PARTNERSHIP');
 assert.equal(classifySupport('Hello','I have a question'),'GENERAL');
 assert.equal(categoryNeedsFounder('REFUND'),true);
 assert.equal(categoryNeedsFounder('ACCESS'),false);
});
