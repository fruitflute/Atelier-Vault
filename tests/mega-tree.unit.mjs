import test from 'node:test';
import assert from 'node:assert/strict';
import {Storage} from 'megajs';
import {reloadTree,catchUpTree,inCloudDrive} from '../mega-tree.js';
const root={h:'root',t:2},trash={h:'trash',t:4};
const folder=(h,p)=>({h,p,t:1});
async function fixture(){
 const storage=new Storage({autologin:false,keepalive:false});await storage.ready;
 storage.api.fetch=async()=>({ok:true,json:async()=>({w:'https://unused.invalid'})});
 let response={ok:[],f:[]};let failure=false;
 storage.api.request=(command,cb)=>{
  assert.equal(command.a,'f');
  queueMicrotask(()=>cb(failure?new Error('offline'):null,structuredClone(response)));
 };
 return {storage,set(nodes){response={ok:[],f:nodes,sn:'base'};},fail(value){failure=value;}};
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
 f.fail(false);f.set([folder('child','missing')]);await assert.rejects(reloadTree(f.storage),/識別/);
 assert.equal(f.storage.files,files);assert.equal(f.storage._importFile,importer);
 assert.equal(f.storage.api.listenerCount('sc'),count);
});
test('cached tree plus action packets moves old gallery into trash and discovers home gallery',async()=>{
 const f=await fixture();f.set([root,trash,folder('old-gallery','root'),folder('old-work','old-gallery')]);
 let calls=0;
 f.storage.api.fetch=async(url)=>{
   assert.equal(new URL(url).pathname,'/sc');calls++;
   return {ok:true,json:async()=>calls%2===1?{sn:'next',a:[{a:'d',n:'old-gallery'},{a:'t',t:{f:[folder('old-gallery','trash'),folder('new-work','new-gallery'),folder('new-gallery','root')]}}]}:{w:'https://must-not-poll.invalid'}};
 };
 const report=await reloadTree(f.storage);
 assert.equal(report.caughtUp,true);assert.equal(calls,2);
 assert.equal(inCloudDrive(f.storage,f.storage.files['old-work']),false);
 assert.equal(inCloudDrive(f.storage,f.storage.files['new-work']),true);
 assert.deepEqual(f.storage.root.children.map(n=>n.nodeId),['new-gallery']);
 await reloadTree(f.storage);assert.equal(inCloudDrive(f.storage,f.storage.files['old-work']),false);
});
test('catch-up error or absent sequence restores prior tree instead of confirming stale data',async()=>{
 const f=await fixture();f.set([root,trash]);await f.storage.reload();const old=f.storage.files;
 f.storage.api.fetch=async()=>({ok:true,json:async()=>-4});
 await assert.rejects(reloadTree(f.storage),/EAPI \(-4\)/);assert.equal(f.storage.files,old);
 await assert.rejects(catchUpTree(f.storage.api,null,new Map()),/更新位置/);
});
test('catch-up handles updates and deletions and has a bounded page count',async()=>{
 const nodes=new Map([['n',{h:'n',a:'old'}],['gone',{h:'gone'}]]);
 const api={gateway:'https://mock.invalid/',sid:'not-real',fetch:async()=>({ok:true,json:async()=>({w:'unused',a:[{a:'u',n:'n',at:'new',ts:123},{a:'d',n:'gone'}]})})};
 await catchUpTree(api,'start',nodes);assert.equal(nodes.get('n').a,'new');assert.equal(nodes.has('gone'),false);
 let i=0;api.fetch=async()=>({ok:true,json:async()=>({sn:String(++i)})});
 await assert.rejects(catchUpTree(api,'start',nodes,{maxPages:2}),/変更が多い/);assert.equal(i,2);
});
