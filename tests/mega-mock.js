// Test-only SDK double. Never included in dist/.
const stats = { uploads: [], deletions: [], closed: 0 };
class Node {
  constructor(name, directory = true, parent = null, data = null) {
    Object.assign(this, { name, directory, parent, data, children: [], nodeId: crypto.randomUUID() });
  }
  find(predicate) { return this.children.find(predicate); }
  async mkdir(name) { const node = new Node(name, true, this); this.children.push(node); return node; }
  upload({ name }, bytes) {
    stats.uploads.push(name);
    if (window.failUpload && name === 'record.json') return { complete: Promise.reject(new Error('Simulated interruption')) };
    const node = new Node(name, false, this, bytes);
    this.children.push(node);
    return { complete: Promise.resolve(node) };
  }
  async downloadBuffer() { return this.data; }
  async delete(permanent) {
    if (permanent !== false) throw new Error('Trash must be explicit');
    stats.deletions.push(permanent);
    this.parent.children = this.parent.children.filter(node => node !== this);
  }
}
const root = new Node('root');
export class Storage {
  constructor(options) {
    this.root = root;
    this.ready = options.password === 'fail' ? Promise.reject(new Error('Invalid credentials')) : Promise.resolve();
    window.mockStats = stats;
  }
  async reload() {}
  async close() { stats.closed++; }
}
