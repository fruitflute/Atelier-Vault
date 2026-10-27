// Only fixed categories/codes leave the adapter. Never expose raw error messages,
// file IDs, names, paths, URLs, credentials, or prompt contents in diagnostics.
export function classifySyncError(error) {
  const message=String(error?.message||'');
  const api=message.match(/\b(E[A-Z]+)\s*\((-\d+)\)/);
  const allowed=new Set([-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12,-13,-14,-15,-16,-17,-18,-19,-24,-25,-26,-27,-28,-29]);
  const code=api&&allowed.has(Number(api[2]))?Number(api[2]):null;
  if([-4,-6,-19].includes(code)||/\b429\b/.test(message))return {code:code??429,kind:'rate',pauseMs:30000};
  if(code===-17||/Bandwidth limit reached|\b509\b/.test(message))return {code:code??509,kind:'quota',pauseMs:60000};
  if(code===-15)return {code,kind:'session',pauseMs:0};
  return {code:code??'UNKNOWN',kind:'other',pauseMs:0};
}
export function traceSavedWork(receipt,storage,folders,items) {
  const node=storage.files[receipt.id];
  if(!node)return '一覧に作品フォルダなし';
  if(node.parent?.nodeId!==receipt.parentId)return '保存時と親フォルダが異なる';
  if(!folders.some(folder=>folder.nodeId===receipt.id))return '作品フォルダはあるが探索対象外';
  const metadata=storage.files[receipt.metadataId];
  if(!metadata)return '一覧に作品情報ファイルなし';
  if(metadata.name!=='record.json')return '作品情報ファイル名を認識できない';
  if(metadata.parent?.nodeId!==receipt.id)return '作品情報ファイルの親が異なる';
  return items.some(item=>item.id===receipt.id)?'表示確認済み':'作品情報の読み取り・解析を確認';
}
export function treeCounts(storage,folders=[]) {
  const nodes=Object.values(storage.files);
  const scanned=new Set(folders.map(folder=>folder.nodeId));
  function underRoot(node){const seen=new Set();for(let current=node;current&&!seen.has(current);current=current.parent){if(current===storage.root)return true;seen.add(current);}return false;}
  const metadata=nodes.filter(n=>!n.directory&&n.name==='record.json'&&underRoot(n));
  return {metadataInCloud:metadata.length,metadataOutsideScan:metadata.filter(n=>!scanned.has(n.parent?.nodeId)).length,nodes:nodes.length,unnamed:nodes.filter(n=>n.name==null).length,
    unattached:nodes.filter(n=>n!==storage.root&&n!==storage.trash&&n!==storage.inbox&&!n.parent).length};
}
