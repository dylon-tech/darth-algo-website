import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'da-payments-'));
try {
 execFileSync('node_modules/.bin/tsc',['--target','ES2020','--module','commonjs','--skipLibCheck','--outDir',dir,'app/lib/business-os/payment-summary.ts']);
 const {summarizePayments}=createRequire(import.meta.url)(join(dir,'payment-summary.js'));
 const now=1800000000,day=86400;
 const row=(id,age,amount=1499,currency='usd',status='succeeded')=>({id,created:now-age*day,amount_received:amount,currency,status,livemode:true});
 const result=summarizePayments([row('a',1),row('b',30),row('c',31,2999),row('d',1,2000,'eur'),row('e',2,999,'usd','requires_payment_method'),row('f',61),row('g',0)],now);
 assert.deepEqual(result.currencyMinorUnits,{usd:{current:2998,previous:2999,currentPayments:2,previousPayments:1},eur:{current:2000,previous:0,currentPayments:1,previousPayments:0}});
 assert.deepEqual(summarizePayments([],now).currencyMinorUnits,{});
 assert.throws(()=>summarizePayments([{...row('a',1),livemode:false}],now),/Test data/);
 assert.throws(()=>summarizePayments([row('a',1),row('a',2)],now),/Duplicate/);
 assert.throws(()=>summarizePayments([row('a',1,-1)],now),/Invalid amount/);
 assert.ok(!JSON.stringify(result).includes('amount_received'));
 console.log('PASS: payment windows, currency separation, successful payments only, complete zero, test-data rejection and duplicate-page rejection.');
} finally {rmSync(dir,{recursive:true,force:true});}
