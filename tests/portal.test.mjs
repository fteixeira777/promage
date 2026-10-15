import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePortalFile, MAX_PORTAL_FILE_SIZE, portalError } from '../lib/portal.ts';
test('portal only accepts supported documents with matching extensions', () => {
  for (const [name,type] of [['doc.PDF','application/pdf'],['photo.jpeg','image/jpeg'],['scan.png','image/png']]) {
    assert.doesNotThrow(()=>validatePortalFile({name,type,size:200}));
  }
  assert.throws(()=>validatePortalFile({name:'page.html',type:'text/html',size:200}));
  assert.throws(()=>validatePortalFile({name:'page.html',type:'application/pdf',size:200}));
});
test('portal rejects empty, oversized and excessively named uploads before reserving storage', () => {
  const file={name:'doc.pdf',type:'application/pdf',size:MAX_PORTAL_FILE_SIZE};
  assert.doesNotThrow(()=>validatePortalFile(file));
  assert.throws(()=>validatePortalFile({...file,size:0}));
  assert.throws(()=>validatePortalFile({...file,size:MAX_PORTAL_FILE_SIZE+1}));
  assert.throws(()=>validatePortalFile({...file,name:'x'.repeat(201)+'.pdf'}));
});
test('missing migration is actionable and genuine permission failures are not masked',()=>{
  assert.match(portalError({code:'PGRST202'}),/ainda não foi ativado/);
  assert.equal(portalError({code:'42501',message:'Sem acesso'}),'Sem acesso');
});
