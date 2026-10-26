import test from 'node:test';
import assert from 'node:assert/strict';
import {Storage} from 'megajs';
import {reloadTree} from '../mega-tree.js';
const root={h:'root',t:2},trash={h:'trash',t:4};
const folder=(h,p)=>({h,p,t:1});
async function fixture(){
 const storage=new Storage({autologin:false,keepalive:false});await storage.ready;
 let response={ok:[],f:[]};let failure=false;
 storage.api.request=(command,cb)=>{
  assert.equal(command.a,'f');
  queueMicrotask(()=>cb(failure?new Error('offline'):null,structuredClone(response)));
 };
 return {storage,set(nodes){response={ok:[],f:nodes};},fail(value){failure=value;}};
}
test('real SDK reproduces stale moves and orphaned child imports',async()=>{
 const f=await fixture();f.set([root,trash,folder('home','root'),folder('work','home')]);await f.storage.reload();
 f.set([root,trash,folder('home','root'),folder('work','trash'),folder('child','new-parent'),folder('new-parent','home')]);await f.storage.reload();
 assert.equal(f.storage.files.work.parent.nodeId,'home');
 assert.equal(f.storage.files.child.parent,undefined);
});
test('fresh tree accepts child-first order, moves, removals and repeated reloads',async()=>{
 const f=await fixture();f.set([root,trash,folder('home','root'),folder('work','home')]);await f.storage.reload();
 const count=f.storage.api.listenerCount('sc');
 f.set([folder('child','new-parent'),folder('new-parent','home'),folder('work','trash'),folder('home','root'),trash,root]);
 await reloadTree(f.storage);
 assert.equal(f.storage.files.work.parent,f.storage.trash);
 assert.deepEqual(f.storage.files.home.children.map(x=>x.nodeId),['new-parent']);
 assert.equal(f.storage.files.child.parent,f.storage.files['new-parent']);
 f.set([root,trash,folder('home','root')]);await reloadTree(f.storage);await reloadTree(f.storage);
 assert.equal(f.storage.files.work,undefined);assert.deepEqual(f.storage.files.home.children,[]);
 assert.equal(f.storage.api.listenerCount('sc'),count);
});
test('failed or incomplete refresh restores previous usable tree and import function',async()=>{
 const f=await fixture();f.set([root,trash,folder('work','root')]);await f.storage.reload();
 const files=f.storage.files,importer=f.storage._importFile,count=f.storage.api.listenerCount('sc');
 f.fail(true);await assert.rejects(reloadTree(f.storage),/offline/);
 assert.equal(f.storage.files,files);assert.equal(f.storage.root,files.root);
 f.fail(false);f.set([folder('child','missing')]);await assert.rejects(reloadTree(f.storage),/不完全/);
 assert.equal(f.storage.files,files);assert.equal(f.storage._importFile,importer);
 assert.equal(f.storage.api.listenerCount('sc'),count);
});
