import {catalog, SHELF_LABEL} from './catalog.js';
import {AXES,defaults} from './core.js';
export const PACK_LIMIT = 2 * 1024 * 1024;
const idPattern=/^[a-z0-9][a-z0-9._-]{0,79}$/;
const text=(v,max)=>typeof v==='string' && v.trim().length>0 && v.length<=max;
const list=(v,max,count)=>Array.isArray(v)&&v.length>0&&v.length<=count&&v.every(x=>text(x,max));
export function validatePack(raw) {
  if(!raw || raw.schemaVersion!==1 || (typeof raw.id!=='string'||!idPattern.test(raw.id)) || !text(raw.name,100) || !Array.isArray(raw.items) || !raw.items.length || raw.items.length>1000) throw Error('パックの形式を確認してください。schemaVersion: 1、id、name、1〜1000件のitemsが必要です。');
  const ids=new Set();
  const items=raw.items.map((x,i)=>{
    if(!x || (typeof x.id!=='string'||!idPattern.test(x.id)) || ids.has(x.id)) throw Error(`${i+1}件目: idが不正、またはパック内で重複しています。`);
    ids.add(x.id);
    if(!text(x.name,100)||!Object.hasOwn(SHELF_LABEL,x.category)||!list(x.palettes,200,20)||!list(x.details,2000,20)) throw Error(`${i+1}件目: name・category（A〜F）・palettes・detailsを確認してください。`);
    if(x.tags!==undefined && (!Array.isArray(x.tags)||x.tags.length>20||!x.tags.every(t=>text(t,40))))throw Error(`${i+1}件目: tagsは40文字以内、20個までです。`);
    if(x.source!==undefined && !text(x.source,500))throw Error(`${i+1}件目: sourceは500文字以内です。`);
    return {id:x.id,name:x.name,category:x.category,palettes:[...x.palettes],details:[...x.details],tags:[...(x.tags||[])],source:x.source||''};
  });
  return {schemaVersion:1,id:raw.id,name:raw.name,items};
}
export function allEntries(packs=[]) {return [...catalog,...packs.flatMap(p=>p.items.map(x=>({...x,id:`pack:${p.id}:${x.id}`,packId:p.id,packName:p.name})))];}
export function searchEntries(entries,{query='',category='',mood='',favoriteOnly=false,favorites=[],packId=''}={}){
  const normalize=x=>String(x).normalize('NFKC').toLocaleLowerCase();
  const words=normalize(query).trim().split(/\s+/).filter(Boolean);
  const moodWords=normalize(mood).trim().split(/\s+/).filter(Boolean);
  return entries.filter(x=>{
    const full=normalize([x.name,...x.palettes,...x.details,...x.tags].join(' '));
    return (!category||x.category===category)&&(!packId||x.packId===packId)&&(!favoriteOnly||favorites.includes(x.id))&&words.every(w=>full.includes(w))&&moodWords.every(w=>full.includes(w));
  }).sort((a,b)=>{
    if(!words.length)return 0;
    const score=x=>words.filter(w=>normalize(x.name).includes(w)).length;
    return score(b)-score(a);
  });
}
export function validateSnapshot(raw){
  if(!raw||raw.schemaVersion!==1||!raw.axes||typeof raw.axes!=='object'||Array.isArray(raw.axes))throw Error('対応していない設定ファイルです。');
  const axes=defaults();
  for(const c of AXES.flatMap(g=>g.controls)){
    if(!Object.hasOwn(raw.axes,c.id))continue;
    const v=raw.axes[c.id];
    if(c.kind==='multi'){
      if(!Array.isArray(v)||v.length>30||!v.every(x=>c.options.some(o=>o.value===x)))throw Error(`設定 ${c.id} が不正です。`);
      axes[c.id]=[...v];
    } else if(c.kind==='toggle'){
      if(typeof v!=='boolean')throw Error(`設定 ${c.id} が不正です。`);axes[c.id]=v;
    } else if(c.options){
      if(!c.options.some(o=>o.value===v))throw Error(`設定 ${c.id} が不正です。`);axes[c.id]=v;
    } else {if(typeof v!=='string'||v.length>10000)throw Error(`設定 ${c.id} が不正です。`);axes[c.id]=v;}
  }
  if(raw.axes.finish!==undefined&&!['selfie','professional'].includes(raw.axes.finish))throw Error('仕上がりの設定が不正です。');
  axes.finish=raw.axes.finish||'selfie';
  axes.mode=raw.axes.mode==='advanced'?'advanced':'basic';
  axes.verbosity=['light','standard','full'].includes(raw.axes.verbosity)?raw.axes.verbosity:'standard';
  let outfit=null;
  if(raw.outfit){const o=raw.outfit;
    if(!text(o.id,200)||!text(o.name,100)||!Object.hasOwn(SHELF_LABEL,o.category)||!text(o.palette,200)||!text(o.detail,2000))throw Error('衣装の設定が不正です。');
    outfit={id:o.id,name:o.name,category:o.category,palette:o.palette,detail:o.detail};
  }
  return {schemaVersion:1,axes,outfit};
}
export function suggestions(entries,current,locks={},excluded=[],random=Math.random){
  const eligible=entries.filter(e=>!excluded.includes(e.id));
  const pick=arr=>arr.length?arr[Math.min(arr.length-1,Math.floor(random()*arr.length))]:null;
  const base=current&&eligible.find(e=>e.id===current.id);
  const same=eligible.filter(e=>!current||e.category===current.category);
  const other=eligible.filter(e=>!current||e.category!==current.category);
  const choose=(entry,label,index)=>{
    if(!entry)return null;
    const palettes=entry.palettes.filter(p=>p!==current?.palette);
    const details=entry.details.filter(d=>d!==current?.detail);
    const outfit={id:entry.id,name:entry.name,category:entry.category,palette:pick(palettes.length?palettes:entry.palettes),detail:pick(details.length?details:entry.details)};
    if(current){
      if(locks.palette)outfit.palette=current.palette;
      if(locks.detail||(index===1&&base))outfit.detail=current.detail;
    }
    const changes=current?['name','palette','detail'].filter(k=>outfit[k]!==current[k]).map(k=>({name:'衣装',palette:'配色',detail:'ディテール'})[k]):['衣装','配色','ディテール'];
    return changes.length?{label,outfit,changes}:null;
  };
  const anchor=locks.motif?base:null;
  if(locks.motif&&!base)return [];
  const near=same.filter(e=>e.id!==current?.id);
  const candidates=[choose(anchor||pick(near.length?near:same),'この雰囲気のまま',0),choose(base||pick(same),base?'色で気分を変えて':'別の組み合わせ',1),choose(anchor||pick(other.length?other:eligible),'少しだけ冒険',2)].filter(Boolean);
  const seen=new Set();return candidates.filter(c=>{const key=JSON.stringify(c.outfit);if(seen.has(key))return false;seen.add(key);return true;});
}
