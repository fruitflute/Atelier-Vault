// Test-only SDK double. Never included in dist/.
const stats = { uploads: [], deletions: [], closed: 0, downloads: [] };
class Node {
  constructor(name, directory = true, parent = null, data = null) {
    Object.assign(this, { name, directory, parent, data, children: [], nodeId: crypto.randomUUID() });
  }
  find(predicate) { return this.children.find(predicate); }
  async mkdir(name) { if(this.remote)return this.remote.mkdir(name); const node = new Node(name, true, this); this.children.push(node); return node; }
  upload({ name }, bytes) {
    if(this.remote)return this.remote.upload({name},bytes);
    stats.uploads.push(name);
    if (window.failUpload && name === 'record.json') return { complete: Promise.reject(new Error('Simulated interruption')) };
    const node = new Node(name, false, this, bytes);
    this.children.push(node);
    return { complete: Promise.resolve(node) };
  }
  async downloadBuffer(options) {
    if(this.remote)return this.remote.downloadBuffer(options);
    if (!options?.forceHttps) throw new Error('HTTPS required');
    stats.downloads.push(this.name);
    if(window.metadataError&&this.name==='record.json')throw new Error(window.metadataError);
    if (this.transientFailures > 0) { this.transientFailures--; throw new Error('Temporary metadata failure'); }
    if ((window.failReads && this.name === 'record.json') || (window.failThumbs && this.name === 'thumb-01.jpg') || this.failRead) throw new Error('Simulated download failure');
    return this.data;
  }
  async delete(permanent) {
    if(this.remote)return this.remote.delete(permanent);
    if (permanent !== false) throw new Error('Trash must be explicit');
    stats.deletions.push(permanent);
    if(window.delayTrash)return;
    this.parent.children = this.parent.children.filter(node => node !== this);
    this.parent=trash;trash.children.push(this);
  }
}
const root = new Node('root'), trash=new Node('trash');
let seeded = false;
function seedFixture(mode) {
  const child = (parent,name,directory=true,data=null) => { const node=new Node(name,directory,parent,data);parent.children.push(node);return node; };
  if (mode === 'duplicate') child(root,'PromptGallery');
  const home=child(root,'PromptGallery'), records=child(home,'records');
  const work=child(records,'work-fixture');
  const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
  child(work,'image-01-fixture.png',false,png);
  child(work,'thumb-01.jpg',false,png);
  const meta={title:'Archived fixture',model:'',tags:[],prompt:'A saved test prompt',negative:'',notes:'',createdAt:'2026-01-01T00:00:00Z',schemaVersion:1,images:[{file:'image-01-fixture.png',thumb:'thumb-01.jpg',name:'fixture.png',type:'image/png'}]};
  if (mode === 'legacy') delete meta.images[0].type;
  if (mode !== 'incomplete') {
    const json=child(work,'record.json',false,new TextEncoder().encode(mode === 'invalid' ? '{broken' : JSON.stringify(meta)));
    if (mode === 'unreadable') json.failRead=true;
    if (mode === 'transient') json.transientFailures=2;
  }
  if (mode === 'partial') {
    const incomplete=child(records,'work-incomplete');child(incomplete,'image.png',false,png);
    const failed=child(records,'work-failed');child(failed,'record.json',false,new Uint8Array()).failRead=true;
  }
}

export class Storage {
  constructor(options) {
    if (!seeded && window.megaFixture) { seedFixture(window.megaFixture); seeded=true; }
    this.files={};
    const listeners=[];
    this.api={listeners:()=>[...listeners],removeListener:(_name,fn)=>{const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);},on:(_name,fn)=>listeners.push(fn)};
    this.ready = options.password === 'fail' ? Promise.reject(new Error('Invalid credentials')) : this.reload();
    window.mockStats = stats;
    window.mockTrashWork=async()=>{const work=root.children.flatMap(h=>h.children).flatMap(r=>r.children)[0];await work.delete(false);};
    window.mockAddWork=()=>seedFixture('new');
  }
  _importFile(raw){
    if(!this.files[raw.h]){
      const remote=raw.remote,node=new Node(remote.name,remote.directory);node.nodeId=raw.h;node.remote=remote;
      this.files[raw.h]=node;
      if(raw.t===2)this.root=node;
      if(raw.t===4)this.trash=node;
      const parent=this.files[raw.p];if(parent){node.parent=parent;parent.children.push(node);}
    }
    return this.files[raw.h];
  }
  async reload() {
    if(window.failTree)throw new Error('Tree offline');
    if(window.hideSavedWork) for(const home of root.children) for(const records of home.children) records.children=records.children.filter(work=>!work.children.some(file=>file.name==='record.json' && stats.uploads.length));
    const rows=[];
    const visit=(node,t)=>{rows.push({h:node.nodeId,p:node.parent?.nodeId,t,remote:node});for(const child of node.children)visit(child,child.directory?1:0);};
    visit(root,2);visit(trash,4);
    if(window.unorderedTree)rows.reverse();
    for(const row of rows)this._importFile(row);
    this.api.on('sc',()=>{});
  }
  async close() { stats.closed++; }
}
