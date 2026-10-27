// Pinned MEGAJS 1.3.10 adapter. A tree response can precede subsequent
// server-client action packets. Catch up once; do not start a long poll.
export async function catchUpTree(api,sn,nodes,{maxPages=30,timeoutMs=30000}={}) {
  if(typeof sn!=='string'||!sn)throw new Error('MEGAの一覧更新位置を取得できませんでした。');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let changes=0;const deleted=new Set();
  try {
    for(let page=0;page<maxPages;page++){
      const url=new URL('sc',api.gateway);url.search=new URLSearchParams({sn,ssl:'1',sid:api.sid});
      const response=await api.fetch(url.href,{method:'POST',signal:controller.signal});
      if(!response.ok)throw new Error(`MEGA HTTP ${response.status}`);
      const packet=await response.json();
      if(typeof packet==='number')throw new Error(`EAPI (${packet}): MEGAの変更履歴を取得できませんでした。`);
      if(!packet||typeof packet!=='object')throw new Error('MEGAの変更履歴が不完全です。');
      for(const action of packet.a||[]){
        if(action.a==='t')for(const raw of action.t?.f||[]){nodes.set(raw.h,{...nodes.get(raw.h),...raw});deleted.delete(raw.h);changes++;}
        else if(action.a==='d'){deleted.add(action.n);changes++;}
        else if(action.a==='u'&&nodes.has(action.n)){
          const raw=nodes.get(action.n);nodes.set(action.n,{...raw,...(action.at?{a:action.at}:{}),...(action.ts!==undefined?{ts:action.ts}:{})});changes++;
        }
      }
      // A wait URL means all pending packets have been consumed. Never follow it.
      if(packet.w){for(const id of deleted)nodes.delete(id);return {caughtUp:true,changes,pages:page+1};}
      if(typeof packet.sn!=='string'||packet.sn===sn)throw new Error('MEGAの変更履歴の終端を確認できませんでした。');
      sn=packet.sn;
    }
    throw new Error('MEGAの変更が多いため同期を完了できませんでした。時間をおいて更新してください。');
  } finally {clearTimeout(timer);}
}
export function inCloudDrive(storage,node) {
  const seen=new Set();
  for(let current=node;current&&!seen.has(current);current=current.parent){
    if(current===storage.trash||current.type===4)return false;
    if(current===storage.root)return current.type===2;
    seen.add(current);
  }
  return false;
}
export async function reloadTree(storage) {
  const keys=['files','root','trash','inbox','mounts','shareKeys'];
  const previous=Object.fromEntries(keys.map(key=>[key,storage[key]]));
  const importFile=storage._importFile,request=storage.api.request;
  const listeners=new Set(storage.api.listeners('sc'));
  const nodes=new Map();let sn;
  storage.files={};storage.root=undefined;storage.trash=undefined;storage.inbox=undefined;
  storage._importFile=function(raw){nodes.set(raw.h,{...raw});return importFile.call(this,raw);};
  storage.api.request=function(command,callback,...rest){
    if(command.a!=='f')return request.call(this,command,callback,...rest);
    // Match the official client's full-tree request without tree-cache opt-in.
    return request.call(this,{...command,r:1},(error,response)=>{sn=response?.sn;callback(error,response);},...rest);
  };
  try {
    await storage.reload();
    const report=await catchUpTree(storage.api,sn,nodes);
    storage.files={};storage.root=undefined;storage.trash=undefined;storage.inbox=undefined;storage.mounts=[];
    for(const raw of nodes.values())importFile.call(storage,{...raw});
    if(storage.root?.type!==2||storage.trash?.type!==4)throw new Error('MEGAのホームとごみ箱を識別できませんでした。');
    for(const file of Object.values(storage.files)){file.parent=undefined;if(file.directory)file.children=[];}
    for(const [id,raw] of nodes){
      const file=storage.files[id],parent=storage.files[raw.p];
      if(parent?.directory&&file.type<2){file.parent=parent;parent.children.push(file);}
    }
    return report;
  } catch(error){Object.assign(storage,previous);throw error;}
  finally {
    storage._importFile=importFile;storage.api.request=request;
    for(const listener of storage.api.listeners('sc'))if(!listeners.has(listener))storage.api.removeListener('sc',listener);
  }
}
