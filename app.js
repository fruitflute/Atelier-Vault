/* Atelier Vault: client-only MEGA prototype. No credentials or personal content are persisted in the app origin. */
const $ = (id) => document.getElementById(id);
const SDK_URL = './vendor/megajs-1.3.10.mjs';
const ROOT_NAME = 'PromptGallery';
const MAX_IMAGES = 8;
const MAX_SIZE = 20 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function newId() { if (typeof crypto.randomUUID === 'function') return crypto.randomUUID(); const b = new Uint8Array(16); crypto.getRandomValues(b); return [...b].map(x => x.toString(16).padStart(2,'0')).join(''); }
const state = {
  mode: 'demo', client: null, records: [], selection: [], activeRecord: null,
  objectUrls: new Map(), imageUrls: new Map(), busy: false, toastTimer: null,
  generation: 0,
};

function toast(message, error = false) {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { el.className = 'toast'; }, 4200);
}
function busy(message, detail = '', progress = 0) {
  state.busy = true;
  document.querySelectorAll('#saveBtn, #createDock button').forEach(b => b.disabled = true);
  $('busyOverlay').hidden = false;
  $('busyTitle').textContent = message;
  $('busyDescription').textContent = detail;
  $('progressFill').style.width = `${Math.max(0, Math.min(100, progress))}%`;
}
function unbusy() { state.busy = false; document.querySelectorAll('#saveBtn, #createDock button').forEach(b => b.disabled = false); $('busyOverlay').hidden = true; }
function bytesToString(buffer) { return decoder.decode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)); }
function filenameSafe(name) { return (name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100); }
function fileExtension(f) { const mime = f.type; return mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'gif'; }
function formatDate(value) { try { return new Intl.DateTimeFormat('ja-JP', {year:'numeric', month:'short', day:'numeric'}).format(new Date(value)); } catch { return '—'; } }
function sizeLabel(n) { return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`; }
function escapeSvg(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&apos;', '"':'&quot;'}[c])); }
function demoSvg(title, colors, motif) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="55"/></filter></defs><rect width="900" height="700" fill="url(#g)"/><circle cx="680" cy="120" r="200" fill="${colors[2]}" opacity=".7" filter="url(#b)"/><circle cx="225" cy="510" r="210" fill="${colors[3]}" opacity=".5" filter="url(#b)"/><g stroke="#ffffff" fill="none" opacity=".31"><circle cx="450" cy="345" r="200"/><circle cx="450" cy="345" r="145"/><path d="M0 350H900M450 0V700"/></g><text x="450" y="371" font-size="155" font-family="Georgia" font-style="italic" fill="#ffffff" opacity=".82" text-anchor="middle">${escapeSvg(motif)}</text><text x="450" y="610" font-size="21" font-family="sans-serif" letter-spacing="7" fill="#ffffff" opacity=".85" text-anchor="middle">${escapeSvg(title)}</text></svg>`;
  return URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
}
function makeDemoClient() {
  const demo1 = demoSvg('LIGHT STUDY', ['#DFA8BA','#B89AC5','#FFF1DF','#E5B8CC'], 'L');
  const demo2 = demoSvg('CHROMATIC', ['#B6AACF','#D8A7B9','#FFF0DD','#C0BEDF'], 'C');
  const records = [
    { id: 'sample-01', title: 'Light Study', model:'Seedream V5 Pro', tags:['portrait','cinematic'], prompt:'An atmospheric editorial portrait, gentle window light, nuanced color, thoughtful composition, fine detail.', negative:'oversaturated, low resolution',notes:'サンプル作品です。登録するとMEGAに実際の画像・プロンプトが保存されます。',createdAt:'2026-10-24T02:00:00Z',images:[{name:'light-study.svg', demoUrl:demo1}],demo:true},
    { id: 'sample-02', title: 'Chromatic Reverie', model:'Image model', tags:['art direction','mood'], prompt:'A poetic color study, expressive composition, muted dusty palette, delicate shadows, editorial mood.', negative:'',notes:'このサンプルは端末間同期されません。',createdAt:'2026-10-21T03:00:00Z',images:[{name:'chromatic.svg', demoUrl:demo2}],demo:true},
  ];
  return {
    async list() { return [...records]; },
    async save(meta, files, onProgress) {
      const images = files.map((f) => ({name:f.name, demoUrl:URL.createObjectURL(f)}));
      const rec = {...meta,id:`demo-${newId()}`,images,demo:true};
      records.unshift(rec); onProgress?.(100, 'デモに保存しました'); return rec;
    },
    async thumb(img) { return img.demoUrl; },
    async image(img) { return img.demoUrl; },
    async remove(record) { const i=records.findIndex(r=>r.id===record.id);if(i>=0){ const [removed]=records.splice(i,1); removed.images.forEach(x=>{if(x.demoUrl&&!([demo1,demo2].includes(x.demoUrl))) URL.revokeObjectURL(x.demoUrl);}); } },
    async close() { for (const record of records) for (const img of record.images) URL.revokeObjectURL(img.demoUrl); }
  };
}

/* MEGA adapter: MEGAJS works directly inside the browser, no proxy/server or link sharing. */
async function createMegaClient(email, password, secondFactorCode) {
  let mod;
  try { mod = await import(SDK_URL); }
  catch (e) { throw new Error('MEGAJSライブラリを読み込めません。ページを再読み込みし、アプリの配信ファイルを確認してください。'); }
  const opts = { email, password, keepalive: false, userAgent: null };
  if (secondFactorCode) opts.secondFactorCode = secondFactorCode;
  let storage;
  try { storage = new mod.Storage(opts); await storage.ready; }
  catch (e) { try { await storage?.close(); } catch {} throw new Error(`MEGAログインに失敗しました: ${e?.message || '認証・通信を確認してください'}`); }
  let syncReport = null;
  const directFolders = (parent, name) => (parent?.children || []).filter(x => x.directory && x.name === name);
  async function getFolder() {
    // MEGA allows duplicate names. Prefer an existing records directory for writes.
    const roots = directFolders(storage.root, ROOT_NAME);
    for (const root of roots) {
      const records = directFolders(root, 'records');
      if (records.length) return records[0];
    }
    const root = roots[0] || await storage.root.mkdir(ROOT_NAME);
    return await root.mkdir('records');
  }
  async function uploadBytes(folder, name, data) {
    const bytes = typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
    return await folder.upload({name, size: bytes.byteLength, forceHttps: true}, bytes).complete;
  }
  const download = node => node.downloadBuffer({forceHttps:true});
  const imageType = (info) => IMAGE_TYPES.has(info.type) ? info.type : ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'})[String(info.file).split('.').pop().toLowerCase()];
  return {
    getSyncReport() { return syncReport; },
    async list(onProgress) {
      syncReport = {rootFolders:0,recordFolders:0,folders:0,loaded:0,missingMetadata:0,invalidMetadata:0,unreadableMetadata:0,missingImages:0,failed:false};
      try {
        await storage.reload();
        const roots = directFolders(storage.root, ROOT_NAME);
        const parents = roots.flatMap(root => directFolders(root, 'records'));
        const folders = [...new Map(parents.flatMap(parent => (parent.children || []).filter(x => x.directory)).map(folder => [folder.nodeId, folder])).values()];
        Object.assign(syncReport,{rootFolders:roots.length,recordFolders:parents.length,folders:folders.length});
        const items = [];
        let next = 0, completed = 0;
        const runners = Array.from({length:Math.min(4, folders.length)}, async () => {
          while (next < folders.length) {
            const folder = folders[next++];
            try {
              const metaFile = folder.children?.find(x => !x.directory && x.name === 'record.json');
              if (!metaFile) { syncReport.missingMetadata++; continue; }
              let text;
              try { text = bytesToString(await download(metaFile)); }
              catch { syncReport.unreadableMetadata++; continue; }
              let raw;
              try { raw = JSON.parse(text.replace(/^\uFEFF/, '')); }
              catch { syncReport.invalidMetadata++; continue; }
              if (!raw || typeof raw.title !== 'string' || typeof raw.prompt !== 'string' || !Array.isArray(raw.images)) {
                syncReport.invalidMetadata++; continue;
              }
              const imgs = raw.images.map(info => {
                if (!info || typeof info.file !== 'string') { syncReport.missingImages++; return null; }
                const type = imageType(info);
                const file = folder.children?.find(x => !x.directory && x.name === info.file);
                const thumbFile = folder.children?.find(x => !x.directory && x.name === info.thumb);
                if (!file || !type) { syncReport.missingImages++; return null; }
                return {name:info.name || info.file,file,thumbFile,type};
              }).filter(Boolean);
              items.push({...raw,id:folder.nodeId,folder,images:imgs,model:typeof raw.model === 'string' ? raw.model : '',negative:typeof raw.negative === 'string' ? raw.negative : '',notes:typeof raw.notes === 'string' ? raw.notes : '',tags:Array.isArray(raw.tags) ? raw.tags.filter(t => typeof t === 'string').slice(0,20) : []});
            } finally {
              completed++;
              onProgress?.(Math.round(completed / Math.max(1, folders.length) * 100));
            }
          }
        });
        await Promise.all(runners);
        syncReport.loaded = items.length;
        if (!items.length && (syncReport.unreadableMetadata || syncReport.invalidMetadata)) {
          throw new Error('保存済み作品の情報を読み込めませんでした。同期状況を確認し、時間をおいて更新してください。');
        }
        return items;
      } catch (error) { syncReport.failed = true; throw error; }
    },
    async save(meta, files, onProgress) {
      const parent = await getFolder();
      const name = `work-${Date.now()}-${newId().slice(0,8)}`;
      const folder = await parent.mkdir(name);
      try {
        const imageEntries = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          onProgress?.(Math.round(i / (files.length + 1) * 100), `画像 ${i+1}/${files.length} を暗号化してアップロード中`);
          const ext = fileExtension(file);
          const basename = `image-${String(i+1).padStart(2,'0')}-${filenameSafe(file.name.replace(/\.[^.]+$/, ''))}`;
          const fileName = `${basename}.${ext}`;
          await uploadBytes(folder, fileName, await file.arrayBuffer());
          let thumbName = '';
          try {
            const blob = await makeThumb(file);
            thumbName = `thumb-${String(i+1).padStart(2,'0')}.jpg`;
            await uploadBytes(folder, thumbName, await blob.arrayBuffer());
          } catch (thumbErr) { console.warn('Thumbnail unavailable', thumbErr); }
          imageEntries.push({file:fileName,thumb:thumbName,name:file.name,type:file.type});
        }
        // Commit marker is uploaded last. Other devices won't see half-uploaded works.
        const manifest = {...meta, schemaVersion:1, images:imageEntries};
        onProgress?.(94, 'プロンプト情報を書き込み中');
        await uploadBytes(folder, 'record.json', JSON.stringify(manifest, null, 2));
        onProgress?.(100, '保存しました');
        return true;
      } catch (err) {
        try { await folder.delete(false); } catch {} // trash partial work, don't permanently erase
        throw err;
      }
    },
    async thumb(img) {
      if (img.thumbFile) {
        try { return URL.createObjectURL(new Blob([await download(img.thumbFile)],{type:'image/jpeg'})); }
        catch { /* Fall back to the original image when the thumbnail is unavailable. */ }
      }
      if (!img.file) return null;
      return URL.createObjectURL(new Blob([await download(img.file)],{type:img.type}));
    },
    async image(img) { if (!img.file) return null; const data=await download(img.file); return URL.createObjectURL(new Blob([data],{type:img.type})); },
    async remove(record) { await record.folder.delete(false); },
    async close() { try { await storage.close(); } catch {} },
  };
}
async function makeThumb(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const max = 540;
    const ratio = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.76));
    if (!blob) throw new Error('サムネイル生成エラー');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

function setConnection() {
  const badge = $('connectionBadge');
  badge.className = 'connection-badge ' + (state.mode === 'mega' ? 'online' : state.mode === 'demo' ? 'demo' : '');
  badge.innerHTML = `<span class="live-dot"></span>${state.mode==='mega'?'MEGA接続中':state.mode==='demo'?'デモモード':'未接続'}`;
  $('connectBtn').textContent = state.mode === 'mega' ? '接続を切る' : 'MEGAに接続';
  $('saveDestination').textContent = state.mode === 'mega' ? '非公開のMEGAに保存されます' : 'デモ保存（端末間同期なし）';
  $('gallerySubline').textContent = state.mode === 'mega' ? 'MEGAの作品と同期中。最新表示は「更新」から。' : '現在はサンプル表示です。MEGAに接続すると端末間で同期できます。';
}
async function switchClient(client, mode) {
  state.generation += 1;
  $('detailDialog').close();
  $('recordForm').reset();
  clearSelection();
  resetUrlCache();
  try { await state.client?.close(); } catch {}
  state.client = client;
  state.mode = mode;
  state.records = [];
  setConnection();
  $('searchInput').value='';
  $('syncNotice').hidden=true;
  renderGallery();
  return await refresh();
}
function resetUrlCache() {
  for (const url of [...state.objectUrls.values(), ...state.imageUrls.values()]) { try { URL.revokeObjectURL(url); } catch {} }
  state.objectUrls.clear(); state.imageUrls.clear();
}
function showSyncReport(report, failed = false) {
  const box = $('syncNotice'); box.replaceChildren();
  if (state.mode !== 'mega') { box.hidden = true; return; }
  box.hidden = false;
  const hasIssues = report && (report.missingMetadata || report.invalidMetadata || report.unreadableMetadata || report.missingImages);
  box.className = `sync-notice${failed ? ' error' : hasIssues ? ' warning' : ''}`;
  const title = document.createElement('strong');
  title.textContent = failed ? '同期が完了していません' : hasIssues ? '一部の作品を読み込めませんでした' : `同期完了 · ${report?.loaded || 0}作品`;
  box.append(title);
  if (!failed) { const time=document.createElement('span'); time.className='sync-time'; time.textContent=`最終確認 ${new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit'}).format(new Date())} · 画像は順に表示されます`; box.append(time); }
  const message = document.createElement('p');
  message.textContent = failed ? '表示できていた作品は保持しています。接続・MEGAの転送制限を確認し、更新をお試しください。' :
    !report?.rootFolders ? 'MEGA直下に PromptGallery フォルダが見つかりません。同じアカウントと保存場所かをご確認ください。' :
    !report.recordFolders ? 'PromptGallery 内に records フォルダが見つかりません。' :
    hasIssues ? '作品データは変更していません。下の同期状況で読み込めない段階を確認できます。' : '保存済み作品を読み込みました。別端末での変更は「更新」で反映できます。';
  if (failed || hasIssues || !report?.loaded) box.append(message);
  if (failed || hasIssues) { const retry=document.createElement('button'); retry.type='button'; retry.className='text-button'; retry.textContent='もう一度読み込む'; retry.addEventListener('click',refresh); box.append(retry); }
  if (report) {
    const details = document.createElement('details'); details.open = failed || !!hasIssues || !report.loaded;
    const summary = document.createElement('summary'); summary.textContent = '同期状況';
    const counts = document.createElement('p');
    counts.textContent = `保存先 ${report.rootFolders}件 / records ${report.recordFolders}件 / 作品フォルダ ${report.folders}件 / 表示 ${report.loaded}件 / JSONなし ${report.missingMetadata}件 / JSON取得失敗 ${report.unreadableMetadata}件 / JSON形式不一致 ${report.invalidMetadata}件 / 画像未検出 ${report.missingImages}件`;
    details.append(summary,counts);box.append(details);
  }
}
async function refresh() {
  if (!state.client || state.busy) return false;
  busy(state.mode==='mega'?'MEGAから同期中':'ギャラリーを準備中','作品情報を読み込んでいます',5);
  try {
    const records = await state.client.list(p => { $('progressFill').style.width = `${p}%`; $('busyDescription').textContent = `作品情報を確認しています · ${p}%`; });
    state.generation += 1;
    resetUrlCache();
    state.records = records;
    renderGallery();
    showSyncReport(state.client.getSyncReport?.());
    return true;
  } catch (e) {
    showSyncReport(state.client.getSyncReport?.(), true);
    $('emptyTitle').textContent = '作品をまだ表示できません';
    $('emptyDescription').textContent = '保存済みの作品がないとは限りません。上の同期状況をご確認ください。';
    toast(`更新に失敗しました: ${e.message}`,true);
    return false;
  } finally { unbusy(); }
}
function renderGallery() {
  const query = $('searchInput').value.trim().toLocaleLowerCase();
  const list = state.records.filter(r => [r.title,r.model,r.prompt,...(r.tags || [])].join(' ').toLocaleLowerCase().includes(query));
  list.sort((a,b) => {if($('sortSelect').value==='name')return a.title.localeCompare(b.title,'ja');const order = new Date(b.createdAt)-new Date(a.createdAt);return $('sortSelect').value==='oldest'?-order:order;});
  const grid = $('galleryGrid');
  grid.replaceChildren();
  $('totalLabel').textContent = `${list.length} items`;
  $('galleryCount').textContent = state.records.length;
  document.querySelector('.hero').classList.toggle('has-works', state.records.length > 0);
  $('emptyState').hidden = list.length !== 0;
  $('emptyTitle').textContent = query ? '検索に一致する作品がありません' : state.mode === 'mega' ? '表示できる作品がありません' : '最初の作品を登録しましょう';
  $('emptyDescription').textContent = query ? '検索条件を変えてお試しください。' : state.mode === 'mega' ? '同期状況と、MEGAの保存場所をご確認ください。' : '画像とプロンプトをひと組にして保存できます。';
  for(const record of list) {
    const card = document.createElement('button');card.type='button';card.className='work-card';card.dataset.id=record.id;
    const thumb = document.createElement('div');thumb.className='work-thumb';
    const mark = document.createElement('span');mark.className='thumb-placeholder';mark.textContent='✧';thumb.append(mark);
    const count = document.createElement('span'); count.className='work-images-label';count.textContent=`▧ ${record.images.length}`;thumb.append(count);
    const body=document.createElement('div');body.className='work-content';
    const h3=document.createElement('h3');h3.textContent=record.title;
    const meta=document.createElement('div');meta.className='work-meta';meta.textContent=`${record.model || 'モデル未指定'} · ${formatDate(record.createdAt)}`;
    const tags=document.createElement('div');tags.className='work-tags';
    for(const t of record.tags.slice(0,3)) {const el=document.createElement('span');el.className='tag';el.textContent=t;tags.append(el);}
    body.append(h3,meta,tags);card.append(thumb,body);grid.append(card);
    card.addEventListener('click',()=>openDetail(record.id));
    if(record.images[0]) { const image = document.createElement('img');image.alt=record.title;image.loading='lazy'; thumb.insertBefore(image,mark);const failed = () => { if(image.isConnected){image.remove();mark.classList.add('image-error');mark.textContent='画像を読み込めません。詳細から再確認できます。';} };
      image.addEventListener('error', failed, {once:true});
      image.addEventListener('load', () => mark.remove(), {once:true});
      loadThumb(record.images[0]).then(url=>{if(url&&image.isConnected)image.src=url;else failed();}).catch(failed); }
  }
}
async function loadThumb(img) {
  if(state.objectUrls.has(img)) return state.objectUrls.get(img);
  const client = state.client, generation = state.generation;
  const url = await client.thumb(img);
  if(state.generation !== generation) { if(client !== state.client && url) URL.revokeObjectURL(url); return null; }
  if(url && state.mode==='mega') state.objectUrls.set(img,url);
  return url;
}
async function loadImage(img) {
  if(state.imageUrls.has(img)) return state.imageUrls.get(img);
  const client=state.client,generation=state.generation;
  const url=await client.image(img);
  if(state.generation!==generation){if(client !== state.client && url)URL.revokeObjectURL(url);return null;}
  if(url && state.mode==='mega')state.imageUrls.set(img,url);
  return url;
}
function goto(view) {
  $('createDock').hidden = view !== 'create';
  if(view === 'create') renderDraft();
  for(const el of document.querySelectorAll('.view')) el.classList.toggle('active-view',el.id===`view-${view}`);
  for(const el of document.querySelectorAll('[data-view]')) el.classList.toggle('active',el.dataset.view===view);
  $('pageTitle').textContent = ({gallery:'My gallery',create:'Create & archive',about:'About & privacy'})[view] || '';
  window.scrollTo({top:0,behavior:'instant'});
}
function clearSelection() { for(const item of state.selection) URL.revokeObjectURL(item.url);state.selection=[];$('fileInput').value='';renderSelection(); }
function renderDraft() {
  $('draftTitle').textContent = $('recordTitle').value.trim() || 'まだ名前のない作品';
  const holder=$('draftImage'); holder.replaceChildren();
  if(state.selection.length) { const img=document.createElement('img'); img.src=state.selection[0].url; img.alt=$('recordTitle').value.trim() || '保存前の作品'; holder.append(img); }
  else { const hint=document.createElement('span'); hint.textContent='ここに、あなたの作品を ♡'; holder.append(hint); }
  $('draftMeta').textContent = state.selection.length ? `${state.selection.length}枚を保存 · ${$('recordModel').value.trim() || 'モデル未指定'}` : '画像を選ぶと、ここで全体を確かめられます。';
  $('draftTags').replaceChildren();
  for(const tag of formMeta().tags.slice(0,3)) { const el=document.createElement('span'); el.className='tag'; el.textContent=tag; $('draftTags').append(el); }
}
function renderSelection() {
  renderDraft();
  const box=$('uploadPreviews');box.replaceChildren();
  for(const item of state.selection){const container=document.createElement('div');container.className='upload-chip';const img=document.createElement('img');img.src=item.url;img.alt=item.file.name;const remove=document.createElement('button');remove.type='button';remove.className='remove-chip';remove.textContent='×';remove.title='この画像を外す';remove.addEventListener('click',()=>{state.selection=state.selection.filter(x=>x!==item);URL.revokeObjectURL(item.url);renderSelection();});container.append(img,remove);box.append(container);}
}
function addFiles(files) {
  for(const file of files){
    if(state.selection.length >= MAX_IMAGES) {toast(`画像は最大${MAX_IMAGES}枚までです`,true);break;}
    if(!IMAGE_TYPES.has(file.type)) {toast(`${file.name}: 対応していない画像形式です`,true);continue;}
    if(file.size>MAX_SIZE) {toast(`${file.name}: 20MBを超えています`,true);continue;}
    if(state.selection.some(x=>x.file.name===file.name && x.file.size===file.size)){continue;}
    state.selection.push({file,url:URL.createObjectURL(file)});
  }
  renderSelection();
}
function formMeta() { return {title:$('recordTitle').value.trim(),model:$('recordModel').value.trim(),tags:$('recordTags').value.split(/[,、，\n]/).map(x=>x.trim()).filter(Boolean).slice(0,20),prompt:$('recordPrompt').value.trim(),negative:$('recordNegative').value.trim(),notes:$('recordNotes').value.trim(),createdAt:new Date().toISOString()}; }
async function saveRecord(event) {
  event.preventDefault();
  if(state.busy)return;
  const meta=formMeta();
  if(!meta.title || !meta.prompt) {toast('作品タイトルとプロンプトは必須です',true);return;}
  if(!state.selection.length) {toast('画像を1枚以上選択してください',true);return;}
  busy('作品を保存しています','画像とプロンプトを処理中',1);
  try{
    await state.client.save(meta,state.selection.map(x=>x.file),(value,description)=>{ $('progressFill').style.width=`${value}%`; $('busyDescription').textContent=description; });
    $('recordForm').reset();clearSelection();
    unbusy();
    const synced = await refresh();
    goto('gallery');toast(state.mode==='mega' ? (synced ? 'MEGAへの保存が完了しました' : '保存は完了しましたが、一覧の再取得に失敗しました。同期状況をご確認ください。') : 'デモに保存しました（端末間同期はされません）', !synced);
  }catch(e){toast(`保存できませんでした: ${e.message}`,true);}
  finally{unbusy();}
}
async function openDetail(id) {
  const record=state.records.find(r=>r.id===id);if(!record)return;
  state.activeRecord=record;
  $('detailTitle').textContent=record.title;
  $('detailModel').textContent=record.model||'未指定';
  $('detailDate').textContent=formatDate(record.createdAt);
  $('detailPrompt').textContent=record.prompt;
  $('detailNegative').textContent=record.negative||'';
  $('detailNegativeWrapper').hidden=!record.negative;
  $('detailNotes').textContent=record.notes||'';
  $('detailNotesWrapper').hidden=!record.notes;
  $('detailTags').replaceChildren();
  for(const tag of record.tags){const el=document.createElement('span');el.className='tag';el.textContent=tag;$('detailTags').append(el);}
  const thumbs=$('detailThumbs');thumbs.replaceChildren();
  const holder=$('detailImageHolder');holder.replaceChildren();
  const placeholder=document.createElement('div');placeholder.className='detail-image-placeholder';placeholder.textContent='✧';holder.append(placeholder);
  $('detailDialog').showModal();
  record.images.forEach((img,index)=>{
    const b=document.createElement('button');b.type='button';if(index===0)b.className='selected';
    const i=document.createElement('img');i.alt=`${index+1}枚目`;b.append(i);thumbs.append(b);
    loadThumb(img).then(url=>{if(b.isConnected&&url)i.src=url;}).catch(()=>{});
    b.addEventListener('click',()=>selectDetailImage(record,index));
  });
  if(record.images.length)selectDetailImage(record,0);
}
async function selectDetailImage(record,index) {
  if(state.activeRecord!==record || !$('detailDialog').open)return;
  [...$('detailThumbs').children].forEach((el,i)=>el.classList.toggle('selected',i===index));
  const holder=$('detailImageHolder');holder.replaceChildren();
  const loading=document.createElement('div');loading.className='detail-image-placeholder';loading.textContent='···';holder.append(loading);
  const token={};state.detailToken=token;
  try{
    const url=await loadImage(record.images[index]);
    if(state.detailToken!==token || state.activeRecord!==record || !$('detailDialog').open)return;
    if(url){const img=document.createElement('img');img.src=url;img.alt=`${record.title} (${index+1})`;img.addEventListener('error',()=>{if(state.detailToken===token){holder.replaceChildren();const msg=document.createElement('p');msg.className='image-error';msg.textContent='画像を表示できません。元ファイルや通信状態をご確認ください。';holder.append(msg);}});holder.replaceChildren(img);}else holder.textContent='画像を読み込めません';
  }catch(e){if(state.detailToken===token)holder.textContent=`画像を読み込めません: ${e.message}`;}
}
async function copyText(text) {
  try {await navigator.clipboard.writeText(text);toast('プロンプトをコピーしました');}
  catch {const el=document.createElement('textarea');el.value=text;document.body.append(el);el.select();const copied=document.execCommand('copy');el.remove();toast(copied?'プロンプトをコピーしました':'コピーできませんでした',!copied);}
}
async function deleteRecord() {
  const rec=state.activeRecord;if(!rec)return;
  if(!confirm(`「${rec.title}」を${state.mode==='mega'?'MEGAのごみ箱へ移動':'デモから削除'}しますか？`))return;
  $('detailDialog').close();busy('削除しています','作品を処理中',20);
  try {await state.client.remove(rec);unbusy();await refresh();toast('作品を削除しました');}
  catch(e){toast(`削除できませんでした: ${e.message}`,true);}
  finally{unbusy();}
}
async function connect(event) {
  event.preventDefault();if(state.busy)return;
  const email=$('loginEmail').value.trim(),pass=$('loginPassword').value,code=$('login2fa').value.trim();
  if(code && !/^\d{6}$/.test(code)) {toast('2段階認証コードは6桁の数字で入力してください',true);return;}
  busy('MEGAに接続しています','認証・ライブラリ読み込み中',5);
  $('loginSubmit').disabled = true;
  try {
    const client=await createMegaClient(email,pass,code);
    $('loginPassword').value='';$('login2fa').value='';$('loginEmail').value='';
    $('connectDialog').close();unbusy();
    const synced = await switchClient(client,'mega');toast(synced ? 'MEGAに接続しました' : 'MEGAには接続しましたが、作品の同期に失敗しました。', !synced);
  } catch(e){toast(e.message,true);}finally{
    $('loginPassword').value='';$('login2fa').value='';
    $('loginSubmit').disabled = false;unbusy();
  }
}
async function disconnect() {
  if(state.busy)return;
  if(!confirm('MEGAとの接続を切り、デモモードへ戻りますか？'))return;
  await switchClient(makeDemoClient(),'demo');toast('接続を切りました');
}
async function initDemo(){state.client=makeDemoClient();state.mode='demo';setConnection();await refresh();}
function setup(){
  document.querySelectorAll('[data-view],[data-go]').forEach(el=>el.addEventListener('click',()=>goto(el.dataset.view||el.dataset.go)));
  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>$(el.dataset.close).close()));
  $('connectBtn').addEventListener('click',()=>state.mode==='mega'?disconnect():$('connectDialog').showModal());
  $('loginForm').addEventListener('submit',connect);
  $('demoBtn').addEventListener('click',()=>{$('connectDialog').close();toast('デモモードを表示しています');});
  $('refreshBtn').addEventListener('click',refresh);
  $('searchInput').addEventListener('input',renderGallery);
  $('sortSelect').addEventListener('change',renderGallery);
  $('recordForm').addEventListener('submit',saveRecord);
  $('recordForm').addEventListener('input',renderDraft);
  $('previewJump').addEventListener('click',()=>{ $('draftPreview').scrollIntoView({block:'start',behavior:'instant'}); $('draftPreview').focus({preventScroll:true}); });
  $('copyDraftBtn').addEventListener('click',()=>copyText($('recordPrompt').value));
  $('templateBtn').addEventListener('click',()=>{if($('recordPrompt').value.trim()&&!confirm('プロンプト欄にテンプレートを追加しますか？'))return;$('recordPrompt').value+=($('recordPrompt').value?'\n\n':'')+'Subject: [被写体]\nScene: [背景・状況]\nMood: [雰囲気]\nLighting: [光の演出]\nComposition: [構図]\nStyle: [表現形式]';$('recordPrompt').focus();});
  $('detailCopyBtn').addEventListener('click',()=>{if(state.activeRecord)copyText(state.activeRecord.prompt);});
  $('reuseBtn').addEventListener('click',()=>{const r=state.activeRecord;if(!r)return;$('recordTitle').value=r.title+' — variation';$('recordModel').value=r.model||'';$('recordTags').value=r.tags.join(', ');$('recordPrompt').value=r.prompt;$('recordNegative').value=r.negative||'';$('recordNotes').value=r.notes||'';clearSelection();$('detailDialog').close();goto('create');toast('プロンプトを編集欄に読み込みました');});
  $('deleteBtn').addEventListener('click',deleteRecord);
  $('fileInput').addEventListener('change',e=>addFiles(e.target.files));
  $('dropZone').addEventListener('click',()=>$('fileInput').click());
  $('dropZone').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('fileInput').click();}});
  $('dropZone').addEventListener('dragover',e=>{e.preventDefault();$('dropZone').classList.add('drag-over');});
  $('dropZone').addEventListener('dragleave',()=>$('dropZone').classList.remove('drag-over'));
  $('dropZone').addEventListener('drop',e=>{e.preventDefault();$('dropZone').classList.remove('drag-over');addFiles(e.dataTransfer.files);});
  // Prevent closing a dialog from leaving a dangling image request selected.
  $('detailDialog').addEventListener('close',()=>{state.detailToken=null;state.activeRecord=null;});
  initDemo();
}
setup();
