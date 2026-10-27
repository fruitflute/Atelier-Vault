import test from 'node:test';import assert from 'node:assert/strict';
import {classifySyncError,traceSavedWork} from '../sync-diagnostics.js';
test('diagnostics retain only approved error codes and apply cooldown to limits',()=>{
 for(const code of [-4,-6,-19])assert.equal(classifySyncError(new Error(`ERATELIMIT (${code}): private URL`)).kind,'rate');
 assert.equal(classifySyncError(new Error('Bandwidth limit reached: 60 seconds')).kind,'quota');
 assert.equal(classifySyncError(new Error('ESID (-15): session secret')).kind,'session');
 assert.deepEqual(classifySyncError(new Error('https://private.example/secret')), {code:'UNKNOWN',kind:'other',pauseMs:0});
});
test('saved receipt locates the missing stage without disclosing identifiers',()=>{
 const receipt={id:'private-work',parentId:'private-parent',metadataId:'private-json'};
 const storage={files:{}};const folder={nodeId:receipt.id,parent:{nodeId:receipt.parentId}};
 assert.equal(traceSavedWork(receipt,storage,[],[]),'一覧に作品フォルダなし');
 storage.files[receipt.id]=folder;assert.equal(traceSavedWork(receipt,storage,[],[]),'作品フォルダはあるが探索対象外');
 assert.equal(traceSavedWork(receipt,storage,[folder],[]),'一覧に作品情報ファイルなし');
 storage.files[receipt.metadataId]={name:'record.json',parent:folder};
 assert.equal(traceSavedWork(receipt,storage,[folder],[]),'作品情報の読み取り・解析を確認');
 assert.equal(traceSavedWork(receipt,storage,[folder],[{id:receipt.id}]),'表示確認済み');
});
