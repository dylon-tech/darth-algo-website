import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerViewFromSearch,ownerViewParam} from '../app/owner/video-studio-model.ts';
for(const [url,view] of [['studio','queue'],['queue','queue'],['team','team'],['agents','team'],['money','bills'],['bills','bills'],['lab','lab'],['indicators','lab'],['inbox','inbox'],['approvals','inbox'],['nonsense','home']])test(`preserves ${url} deep link`,()=>assert.equal(ownerViewFromSearch('?view='+url),view));
test('every internal view round trips through history',()=>{for(const view of ['home','team','queue','bills','lab','inbox'])assert.equal(ownerViewFromSearch('?view='+ownerViewParam(view)),view);});
