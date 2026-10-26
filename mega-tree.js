// MEGAJS 1.3.10 keeps existing nodes on reload and links new children only
// when the parent has already been imported. Rebuild a complete snapshot.
// This adapter intentionally depends on the pinned SDK internals; exercise
// it against the real SDK in tests/mega-tree.unit.mjs when upgrading.
export async function reloadTree(storage) {
  const keys=['files','root','trash','inbox','mounts','shareKeys'];
  const previous=Object.fromEntries(keys.map(key=>[key,storage[key]]));
  const importFile=storage._importFile;
  const listeners=new Set(storage.api.listeners('sc'));
  const parents=new Map();
  storage.files={};storage.root=undefined;storage.trash=undefined;storage.inbox=undefined;
  storage._importFile=function(raw){
    parents.set(raw.h,raw.p);
    return importFile.call(this,raw);
  };
  try {
    await storage.reload();
    if (!storage.root || !storage.trash) throw new Error('MEGAのフォルダ一覧が不完全です。もう一度更新してください。');
    for(const file of Object.values(storage.files)) {
      file.parent=undefined;
      if(file.directory) file.children=[];
    }
    for(const [id,parentId] of parents) {
      const file=storage.files[id],parent=storage.files[parentId];
      if(parent?.directory){file.parent=parent;parent.children.push(file);}
    }
  } catch(error) {
    Object.assign(storage,previous);
    throw error;
  } finally {
    storage._importFile=importFile;
    // reload adds an action listener each time. Keep the original listener
    // (which resolves storage.files dynamically), not duplicate closures.
    for(const listener of storage.api.listeners('sc')) {
      if(!listeners.has(listener)) storage.api.removeListener('sc',listener);
    }
  }
}
