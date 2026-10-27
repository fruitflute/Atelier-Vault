import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {catalog} from '../studio/catalog.js';import {AXES,defaults,compile} from '../studio/core.js';
import {validatePack,validateSnapshot,allEntries,searchEntries,suggestions} from '../studio/library.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./studio-original-fixture.json',import.meta.url)));
const proseRevision=JSON.parse(fs.readFileSync(new URL('./prose-revision.json',import.meta.url)));
const pack=JSON.parse(fs.readFileSync(new URL('../packs/example.json',import.meta.url)));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
test('419 original entries and every option retain original text and order',()=>{
 assert.equal(catalog.length,419);const groups={};for(const c of catalog)(groups[c.category]??=[]).push([c.name,c.palettes,c.details]);
 assert.equal(hash(JSON.stringify(groups)),fixture.catalogSha256);assert.equal(hash(JSON.stringify(AXES)),fixture.axesSha256);
});
test('645 original cases retain selected content outside reviewed prose revisions',()=>{
 const physics='【手と接触】\n見える手は誰の手かが明確で、腕・手首・指先が自然につながる。手指の本数と関節は自然な人体に沿い、物を持つ指は接触と握り方に合わせる。同じ手に同時に無理な役割を持たせない。隠れた部分を無理に見せず、ポーズや指の形は場面に合わせて自由にする。鏡に映る手は同じ手の反射として整合させる。';
 for(const c of fixture.cases){
  const result=compile({...defaults(),verbosity:c.verbosity,...c.patch});
  assert.ok(result.includes(physics));
  const normalized=proseRevision.replacements.reduce((text,{before,after})=>text.replace(after,before),result);
  const legacy=normalized.replace(physics+'\n\n','').replace('美肌加工・CG感・過剰な対称性を避ける。','美肌加工・CG感・過剰な対称性を避ける。手指は「自然にリラックスした指」として肯定形で描く。');
  assert.equal(hash(legacy),c.sha256,JSON.stringify(c.patch));
 }
});
test('emotion text is emitted and the compiler uses the supplied verbosity',()=>{
 const state={...defaults(),'AX-05':'静かな春の朝'};assert.ok(compile(state).includes('情緒：静かな春の朝'));
 assert.notEqual(compile({...state,verbosity:'light'}),compile({...state,verbosity:'full'}));
});
test('pack validation rejects malformed, duplicate and oversized values without coercion',()=>{
 assert.equal(validatePack(pack).items.length,1);
 for(const change of [p=>p.id=23,p=>p.schemaVersion=2,p=>p.items.push(p.items[0]),p=>p.items[0].category='Z',p=>p.items[0].palettes=[],p=>p.items[0].details=['x'.repeat(2001)],p=>p.items[0].tags=[null]]){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
});
test('pack namespaces and keyword, category, favorites and mood filters compose',()=>{
 const p=validatePack(pack), entries=allEntries([p]);assert.equal(entries.length,420);
 const result=searchEntries(entries,{query:'リボンワンピース',category:'C',mood:'ラベンダー'});assert.equal(result.length,1);
 assert.equal(searchEntries(entries,{favoriteOnly:true,favorites:[result[0].id]}).length,1);
 assert.equal(searchEntries(entries,{query:'存在しない名前'}).length,0);
});
test('suggestions are non-mutating, honor locks and never revive excluded entries',()=>{
 const e=catalog[0],current={id:e.id,name:e.name,category:e.category,palette:e.palettes[0],detail:e.details[0]};const before=structuredClone(current);
 const ideas=suggestions(catalog,current,{motif:true,detail:true},[],()=>0.3);assert.ok(ideas.length);for(const idea of ideas){assert.equal(idea.outfit.id,current.id);assert.equal(idea.outfit.detail,current.detail);}assert.deepEqual(current,before);
 assert.deepEqual(suggestions(catalog,current,{},catalog.map(x=>x.id)),[]);
 assert.deepEqual(suggestions(catalog,current,{motif:true,palette:true,detail:true},[]),[]);
});
test('snapshots validate independently of installed packs and preserve all axis values',()=>{
 const p=pack.items[0];const snapshot={schemaVersion:1,axes:{...defaults(),'AX-05':'メモ'},outfit:{id:'pack:removed:item',name:p.name,category:p.category,palette:p.palettes[0],detail:p.details[0]}};
 assert.deepEqual(validateSnapshot(snapshot),snapshot);assert.throws(()=>validateSnapshot({...snapshot,axes:{...snapshot.axes,'AX-23':'bad'}}));assert.throws(()=>validateSnapshot({...snapshot,schemaVersion:99}));
});

test('professional finish replaces default imperfections, preserves explicit choices and restores legacy defaults',()=>{
 const normal=compile(defaults());assert.ok(normal.includes('実際のスマホ写真らしい不完全さ'));
 for(const verbosity of ['light','standard','full']){
 const output=compile({...defaults(),finish:'professional',verbosity,'AX-24':'film','AX-38':['shake']});
 assert.ok(output.includes('プロフェッショナルな写真作品'));assert.ok(!output.includes('実際のスマホ写真らしい不完全さ'));assert.ok(output.includes('本人が撮影するセルフィーの視点'));assert.ok(output.includes('フィルム粒子'));assert.ok(output.includes('許容する不完全さ：手ブレ'));
 }
 const legacy=defaults();delete legacy.finish;assert.equal(validateSnapshot({schemaVersion:1,axes:legacy}).axes.finish,'selfie');assert.equal(validateSnapshot({schemaVersion:1,axes:{...defaults(),finish:'professional'}}).axes.finish,'professional');assert.throws(()=>validateSnapshot({schemaVersion:1,axes:{finish:'bad'}}));
});

test('hand guidance applies to both finishes without forcing all fingers into view',()=>{
 for(const finish of ['selfie','professional'])for(const verbosity of ['light','standard','full']){
  const output=compile({...defaults(),finish,verbosity,'AX-18':'mirror'});
  assert.ok(output.includes('【手と接触】'));
  assert.ok(output.includes('接触と握り方'));
  assert.ok(output.includes('隠れた部分を無理に見せず'));
  assert.ok(output.includes('鏡に映る手は同じ手の反射'));
  assert.ok(!output.includes('自然にリラックスした指'));
  assert.ok(output.includes('撮影方法：鏡越し'));
 }
});

test('selected expression and ambitious design survive every finish and verbosity',()=>{
 for(const finish of ['selfie','professional'])for(const verbosity of ['light','standard','full']){
  const output=compile({...defaults(),finish,verbosity,'AX-05':'凛とした自信。祝祭のような鮮やかさ。','AX-11':'大きな金属装飾と鮮烈な配色','AX-45':'calm','AX-21':'shallow','AX-22':'back'});
  for(const text of ['凛とした自信。祝祭のような鮮やかさ。','大きな金属装飾と鮮烈な配色','表情は静かで、真顔。','浅い被写界深度','逆光'])assert.ok(output.includes(text));
  for(const text of ['汚れを知らぬ','大人になりきっていない','自然な照れと高揚を保つ','落ち着いた画質','過剰なモデル演出'])assert.ok(!output.includes(text));
 }
});

test('selfie depth is optional while professional color need not be subdued',()=>{
 const selfie=compile(defaults());assert.ok(!selfie.includes('浅い被写界深度'));assert.ok(selfie.includes('肌のきめと産毛'));
 const pro=compile({...defaults(),finish:'professional'});assert.ok(pro.includes('鮮烈な表現にも繊細な表現にも応える'));assert.ok(!pro.includes('わずかなノイズ'));
});
