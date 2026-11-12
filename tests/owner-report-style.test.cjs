const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const cache = new Map();
function load(filename) {
  filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename);
  const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;cache.set(filename,mod.exports);
  mod.require=id=>id.startsWith('.')?load(path.resolve(path.dirname(filename),id)+'.ts'):require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return mod.exports;
}
const {ownerReportPreview}=load('app/lib/business-os/owner-report-style.ts');
const original='Result: Your script is saved. Rendering is not connected.\nNext: Connect the existing renderer.\nDetails:\nThe complete requested script stays here, with its evidence and source notes.\nRun ID: internal-audit-id';
const preview=ownerReportPreview(original);
assert.equal(preview,'Result: Your script is saved. Rendering is not connected.\nNext: Connect the existing renderer.');
assert.ok(original.includes('The complete requested script stays here'),'Formatting leaves the stored original untouched');
assert.doesNotMatch(preview,/internal-audit-id|complete requested script/);
assert.match(ownerReportPreview('No errors in the source. The actual publication is unverified.\nNext: Check the receipt.'),/publication is unverified/);
assert.equal(ownerReportPreview('Report saved.'),'Result: Report saved.\nNext: Open the saved result for details.');
assert.ok(preview.length<450);
console.log('PASS owner report preview: concise Result/Next, material limitations retained, original deliverable untouched, and no provider calls.');
