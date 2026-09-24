import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const dir=mkdtempSync(join(tmpdir(),'darth-research-parser-'));
try {
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--moduleResolution','node','--esModuleInterop','--skipLibCheck','--rootDir','app','--outDir',dir,'app/lib/business-os/competitor-research.ts']);
 const require=createRequire(import.meta.url),id=join(dir,'lib/affiliate-db.js');
 require.cache[id]={id,filename:id,loaded:true,exports:{db:()=>{throw Error('No database in parser test');}}};
 const {parseCompetitorFeed,parseCompetitorPage}=require(join(dir,'lib/business-os/competitor-research.js'));
 const pageData={metadata:{channelMetadataRenderer:{externalId:'verified-channel'}},contents:{twoColumnBrowseResultsRenderer:{tabs:[{tabRenderer:{selected:true,content:{items:[{lockupViewModel:{contentId:'abcdefghijk',contentType:'LOCKUP_CONTENT_TYPE_VIDEO',metadata:{lockupMetadataViewModel:{title:{content:'A chart-reading lesson'},metadata:{contentMetadataViewModel:{metadataRows:[{metadataParts:[{text:{content:'2.4K views'}},{text:{content:'3 days ago'}}]}]}}}}}}]}}}]}}};
 const page=()=>`<script>var ytInitialData = ${JSON.stringify(pageData)};</script>`;
 const pagePosts=parseCompetitorPage(page(),'verified-channel',Date.parse('2026-09-20T12:00:00Z'));
 assert.equal(pagePosts.length,1);assert.equal(pagePosts[0].views,2400);assert.equal(pagePosts[0].viewsPerDay,800);assert.equal(pagePosts[0].viewsPrecision,'rounded public display');assert.equal(pagePosts[0].published,'2026-09-17T12:00:00.000Z');
 assert.equal(parseCompetitorPage(page(),'wrong-channel').length,0);
 pageData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.items[0].lockupViewModel.metadata.lockupMetadataViewModel.metadata.contentMetadataViewModel.metadataRows[0].metadataParts[0].text.content='Views unavailable';
 assert.equal(parseCompetitorPage(page(),'verified-channel')[0].views,null);
 const parts=pageData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.items[0].lockupViewModel.metadata.lockupMetadataViewModel.metadata.contentMetadataViewModel.metadataRows[0].metadataParts;
 parts[0]={text:{content:'2.1K'},accessibilityLabel:'2.1 thousand views'};
 parts[1]={text:{content:'1d ago'},accessibilityLabel:'1 day ago'};
 const compact=parseCompetitorPage(page(),'verified-channel',Date.parse('2026-09-24T00:00:00Z'));
 assert.equal(compact[0].views,2100);assert.equal(compact[0].published,'2026-09-23T00:00:00.000Z');
 assert.equal(parseCompetitorPage(page(),'wrong-channel').length,0);
 const feed='<entry><yt:videoId>abcdefghijk</yt:videoId><title>Chart &amp; clarity</title><published>2026-09-18T00:00:00Z</published><media:statistics views="100"/></entry>';
 const parsed=parseCompetitorFeed(feed,Date.parse('2026-09-20T00:00:00Z'));assert.equal(parsed[0].viewsPerDay,50);assert.equal(parsed[0].title,'Chart & clarity');assert.equal(parseCompetitorFeed(feed.replace(' views="100"',''),Date.parse('2026-09-20T00:00:00Z'))[0].views,null);
 console.log('PASS: competitor page/feed parsing, account verification, observed vs unavailable views.');
}finally{rmSync(dir,{recursive:true,force:true});}
