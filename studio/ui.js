import {AXES,defaults,compile,lint} from './core.js';
import {SHELF_LABEL} from './catalog.js';
import {PACK_LIMIT,validatePack,allEntries,searchEntries,validateSnapshot,suggestions} from './library.js';
const $=id=>document.getElementById(id);
const clone=x=>structuredClone(x);
const KEY='atelier-vault-studio-v1';
function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function button(text,fn,className='button button-soft'){const el=element('button',text,className);el.type='button';el.addEventListener('click',fn);return el;}
function options(select,rows,value){select.replaceChildren();for(const [v,label] of rows){const o=element('option',label);o.value=v;select.append(o);}select.value=value;}
export function downloadJson(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=element('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function mountStudio({onUse,copy,notify}) {
  let axes=defaults(),outfit=null,undo=null,entries=[],candidate=null,imported=null,limit=24;
  let prefs={packs:[],favorites:[],recent:[],excluded:[],presets:[]};
  try {const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){
    prefs.packs=(Array.isArray(saved.packs)?saved.packs:[]).map(validatePack);
    for(const key of ['favorites','recent','excluded'])prefs[key]=Array.isArray(saved[key])?saved[key].filter(x=>typeof x==='string').slice(0,2000):[];
    prefs.presets=(Array.isArray(saved.presets)?saved.presets:[]).slice(0,30).map(p=>({name:String(p.name).slice(0,100),snapshot:validateSnapshot(p.snapshot)}));
  }}catch{notify('保存していた制作設定を読み込めませんでした。元の保存データは変更していません。',true);}
  function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));prefs=next;return true;}catch{notify('ブラウザに保存できません。空き容量やプライベートブラウズ設定を確認してください。',true);return false;}}
  function snapshot(){return {schemaVersion:1,axes:clone(axes),outfit:clone(outfit)};}
  function checkpoint(){undo=snapshot();$('studioUndo').disabled=false;}
  function effective(){const s=clone(axes);if(outfit)s['AX-11']=[outfit.name+'。'+outfit.palette+'。'+outfit.detail+'。',s['AX-11']].filter(Boolean).join('\n');return s;}
  function refreshEntries(){entries=allEntries(prefs.packs);}
  refreshEntries();
  $('view-studio').innerHTML=`
    <div class="section-intro"><span class="eyebrow">DRESS AN IDEA</span><h1>好きから、つくろう。</h1><p>衣装と気分を選んで、あなたの一枚へ。空欄は、おまかせの余白です。</p></div>
    <div class="studio-tools"><label>表示 <select id="studioMode"><option value="basic">かんたん</option><option value="advanced">詳細</option></select></label><label>仕上がり <select id="studioFinish" aria-describedby="finishHint"><option value="selfie">セルフィーらしい自然さ</option><option value="professional">プロフェッショナル</option></select></label><button id="studioUndo" type="button" class="text-button" disabled>ひとつ戻す</button><button id="studioReset" type="button" class="text-button">最初から</button><button id="studioPresets" type="button" class="text-button">設定を保存・呼び出す</button></div>
    <p id="finishHint" class="section-caption finish-hint">セルフィーの視点はそのままに、写真の仕上げを選べます。個別に選んだフィルム質感や手ブレなどの指定は残ります。</p><div class="edit-layout studio-layout"><div class="studio-settings"><section class="form-panel wardrobe-panel"><span class="eyebrow">YOUR WARDROBE</span><h2>まずは、衣装から。</h2><p id="chosenOutfit" class="chosen-outfit">まだ選んでいません。下の設定から自由に始めても大丈夫。</p><div class="studio-actions"><button id="openWardrobe" type="button" class="button button-accent">衣装を選ぶ</button><button id="clearOutfit" type="button" class="text-button" hidden>衣装を外す</button></div>
    <details class="inspiration"><summary>✧ ひらめきを見てみる</summary><p class="section-caption">気に入った案を採用するまで、今の設定は変わりません。</p><div class="lock-row"><span>残したいところ</span><label><input type="checkbox" id="lockMotif"> 衣装</label><label><input type="checkbox" id="lockPalette"> 配色</label><label><input type="checkbox" id="lockDetail"> ディテール</label></div><button id="suggestOutfits" type="button" class="button button-soft">3つの提案を見る</button><div id="suggestions" class="suggestion-list" aria-live="polite"></div></details></section><div id="axisGroups"></div></div>
    <aside class="guide-panel"><section class="guide-card prompt-preview" id="studioPreview" tabindex="-1"><span class="eyebrow">READY TO PASTE</span><h2>プロンプトの仕上がり</h2><label class="verbosity-label">文章量 <select id="studioVerbosity"><option value="light">簡潔</option><option value="standard">標準</option><option value="full">丁寧</option></select></label><div class="preview-copy"><button id="studioCopy" type="button" class="button button-accent">プロンプトをコピー</button></div><pre id="studioOutput" tabindex="0"></pre><p id="studioMeter" class="section-caption" aria-live="polite"></p><details id="studioWarnings" hidden><summary>設定のヒント</summary><ul id="studioWarningList"></ul></details><div class="preview-actions"><button id="studioUse" type="button" class="button button-soft">この設定で作品を残す →</button></div><p class="section-caption">コピーして、お使いの画像生成AIへ。できた画像は「作品を残す」で登録できます。</p></section></aside></div>
    <div class="studio-dock"><button id="studioJump" type="button" class="button button-soft">仕上がりを見る</button><button id="studioDockCopy" type="button" class="button button-accent">プロンプトをコピー</button></div>`;
  const wardrobe=element('dialog',undefined,'dialog wardrobe-dialog');wardrobe.id='wardrobeDialog';wardrobe.setAttribute('aria-labelledby','wardrobeTitle');
  wardrobe.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">OPEN THE CLOSET</span><h2 id="wardrobeTitle">衣装を選ぶ</h2></div><button type="button" class="close-icon" aria-label="閉じる">×</button></div>
  <div class="wardrobe-filters"><label class="field"><span>衣装名・種類で探す</span><input id="wardrobeQuery" type="search" placeholder="例：コルセット、メイド、レース"></label><label class="field"><span>種類</span><select id="wardrobeCategory"></select></label><label class="favorite-filter"><input id="wardrobeFavorites" type="checkbox"> ♡ お気に入り</label></div>
  <details class="wardrobe-more"><summary>雰囲気・色・素材やパックで絞る</summary><label class="field"><span>雰囲気・色・素材</span><input id="wardrobeMood" type="search" placeholder="例：クラシカル、青、サテン"></label><label class="field"><span>衣装パック</span><select id="wardrobePack"></select></label><button id="clearWardrobeFilters" type="button" class="text-button">条件をクリア</button></details>
  <details id="recentOutfits"><summary>最近使った衣装</summary><div id="recentList" class="recent-list"></div></details>
  <p id="wardrobeCount" class="section-caption" role="status"></p><div id="wardrobeResults" class="wardrobe-results"></div><button id="wardrobeMore" type="button" class="button button-soft">もっと見る</button>
  <section id="outfitCandidate" class="outfit-candidate" hidden aria-labelledby="candidateTitle"><h3 id="candidateTitle"></h3><label class="field"><span>配色</span><select id="candidatePalette"></select></label><label class="field"><span>ディテール</span><select id="candidateDetail"></select></label><p id="candidateDescription"></p><button id="candidateUse" type="button" class="button button-accent">この衣装を使う</button><p class="section-caption">手書きの補足は残します。衣装の種類・配色・ディテールを設定に添えます。</p></section>
  <details class="pack-manager"><summary>衣装パックを追加・管理</summary><p class="section-caption">追加パック・お気に入り・設定の控えは、このブラウザに保存します。MEGAへの自動同期はありません。別端末へは同じファイルを取り込めます。</p><p><a href="./packs/example.json" download>パックの記入例</a> · <a href="./packs/AI-REQUEST.md" download>別のAIへの依頼文</a> · <a href="./packs/FORMAT.md" download>形式の説明</a></p><label class="field"><span>衣装パック（JSON・2MBまで）</span><input id="packFile" type="file" accept=".json,application/json"></label><div id="packReview" role="status"></div><button id="packConfirm" type="button" class="button button-accent" hidden>このパックを追加</button><div id="packList"></div><details><summary>提案から外した衣装</summary><div id="excludedList"></div></details></details>`;
  document.body.append(wardrobe);wardrobe.querySelector('.close-icon').onclick=()=>wardrobe.close();
  const presets=element('dialog',undefined,'dialog');presets.id='presetDialog';presets.setAttribute('aria-label','設定を保存・呼び出す');
  presets.innerHTML=`<div class="dialog-head"><h2>設定の小さな控え</h2><button type="button" class="close-icon" aria-label="閉じる">×</button></div><p class="dialog-copy">このブラウザに30件まで保存できます。ファイルに書き出すと、別端末にも持ち運べます。</p><label class="field"><span>設定の名前</span><input id="presetName" maxlength="100" placeholder="例：夕方のやわらかな光"></label><button id="presetSave" type="button" class="button button-accent">今の設定を保存</button><button id="presetExport" type="button" class="button button-soft">今の設定を書き出す</button><label class="field"><span>設定ファイルを読み込む</span><input id="presetImport" type="file" accept=".json,application/json"></label><div id="presetList"></div>`;
  document.body.append(presets);presets.querySelector('.close-icon').onclick=()=>presets.close();
  function renderOutput(){const s=effective();const output=compile(s);$('studioOutput').textContent=output;$('studioMeter').textContent=`${Array.from(output).length.toLocaleString('ja-JP')} / 3,000文字（目安）`;
    const warnings=lint(s,output);$('studioWarnings').hidden=!warnings.length;$('studioWarningList').replaceChildren(...warnings.map(w=>element('li',w.message)));
    $('chosenOutfit').textContent=outfit?`${outfit.name} — ${outfit.palette}\n${outfit.detail}`:'まだ選んでいません。下の設定から自由に始めても大丈夫。';$('clearOutfit').hidden=!outfit;
  }
  function renderGroups(){const target=$('axisGroups');target.replaceChildren();
    for(const group of AXES){if(group.tier==='advanced'&&axes.mode!=='advanced')continue;
      const box=element('details',undefined,'form-panel axis-group');box.open=!group.collapsed;const summary=element('summary',group.label);const controls=element('div',undefined,'axis-controls');box.append(summary,controls);
      for(const c of group.controls){if(c.id==='bankPick')continue;
        if(c.kind==='multi'){
          const set=element('fieldset',undefined,'axis-multi');set.append(element('legend',c.label));
          for(const o of c.options){const label=element('label',undefined,'axis-chip');const input=element('input');input.type='checkbox';input.value=o.value;input.checked=axes[c.id].includes(o.value);input.id=`studio-${c.id}-${o.value}`;input.onchange=()=>{checkpoint();axes[c.id]=[...set.querySelectorAll('input:checked')].map(x=>x.value);renderOutput();};label.append(input,element('span',o.label));set.append(label);}controls.append(set);continue;
        }
        const label=element('label',undefined,'field');label.append(element('span',c.label));let input;
        if(c.options){input=element('select');options(input,c.options.map(o=>[o.value,o.label]),axes[c.id]);}
        else if(c.kind==='textarea'){input=element('textarea');input.rows=3;input.maxLength=10000;input.value=axes[c.id];input.placeholder=c.placeholder||'';}
        else {input=element('input');input.type=c.kind==='toggle'?'checkbox':'text';if(c.kind==='toggle')input.checked=axes[c.id];else{input.value=axes[c.id];input.maxLength=10000;input.placeholder=c.placeholder||'';}}
        input.id=`studio-${c.id}`;
        input.addEventListener(c.kind==='textarea'||c.kind==='text'?'input':'change',()=>{checkpoint();axes[c.id]=c.kind==='toggle'?input.checked:input.value;renderOutput();});label.append(input);controls.append(label);
      }target.append(box);
    }
    $('studioFinish').value=axes.finish;$('studioMode').value=axes.mode;$('studioVerbosity').value=axes.verbosity;renderOutput();
  }
  function restore(raw){const valid=validateSnapshot(raw);checkpoint();axes=valid.axes;outfit=valid.outfit;renderGroups();$('suggestions').replaceChildren();}
  function apply(o){checkpoint();outfit=clone(o);if(['A','B','C'].includes(o.category))axes['AX-01']=o.category;
    const next=clone(prefs);next.recent=[o.id,...next.recent.filter(id=>id!==o.id)].slice(0,20);persist(next);renderGroups();$('suggestions').replaceChildren();notify('衣装を設定に添えました。手書きの補足は残しています。');}
  function catalogFilters(){return {query:$('wardrobeQuery').value,category:$('wardrobeCategory').value,mood:$('wardrobeMood').value,favoriteOnly:$('wardrobeFavorites').checked,favorites:prefs.favorites,packId:$('wardrobePack').value};}
  function openCandidate(entry){candidate=entry;$('outfitCandidate').hidden=false;$('candidateTitle').textContent=entry.name;
    options($('candidatePalette'),entry.palettes.map(p=>[p,p]),entry.palettes.includes(outfit?.palette)?outfit.palette:entry.palettes[0]);
    options($('candidateDetail'),entry.details.map(p=>[p,p]),entry.details.includes(outfit?.detail)?outfit.detail:entry.details[0]);
    $('candidateDescription').textContent=$('candidateDetail').value;
    $('outfitCandidate').scrollIntoView({block:'nearest'});$('candidatePalette').focus({preventScroll:true});
  }
  function renderCatalog(){const results=searchEntries(entries,catalogFilters());$('wardrobeCount').textContent=`${results.length}件 / 全${entries.length}件${results.length?'':' · 条件を変えるか、お気に入りの絞り込みを外してください。'}`;
    const target=$('wardrobeResults');target.replaceChildren();
    for(const entry of results.slice(0,limit)){
      const card=element('article',undefined,'outfit-card');const pick=button(entry.name,()=>openCandidate(entry),'outfit-name');pick.dataset.outfitId=entry.id;
      const favorite=button(prefs.favorites.includes(entry.id)?'♥':'♡',()=>{const next=clone(prefs);next.favorites=next.favorites.includes(entry.id)?next.favorites.filter(id=>id!==entry.id):[...next.favorites,entry.id];if(persist(next)){renderCatalog();const nextButton=[...document.querySelectorAll('.outfit-favorite')].find(b=>b.dataset.entryId===entry.id);(nextButton||$('wardrobeQuery')).focus();}},'outfit-favorite');favorite.dataset.entryId=entry.id;favorite.setAttribute('aria-label',`${entry.name}をお気に入り${prefs.favorites.includes(entry.id)?'から外す':'にする'}`);favorite.setAttribute('aria-pressed',String(prefs.favorites.includes(entry.id)));
      card.append(pick,favorite,element('p',entry.palettes.join(' / '),'palette-description'),element('p',entry.details[0],'outfit-excerpt'),element('small',entry.packName||SHELF_LABEL[entry.category]));target.append(card);
    }
    $('wardrobeMore').hidden=results.length<=limit;
    $('recentList').replaceChildren(...prefs.recent.map(id=>entries.find(e=>e.id===id)).filter(Boolean).slice(0,6).map(e=>button(e.name,()=>openCandidate(e),'text-button')));
    $('recentOutfits').hidden=!$('recentList').children.length;
  }
  function refreshPackUI(){const selected=$('wardrobePack').value;options($('wardrobePack'),[['','すべてのパック'],...prefs.packs.map(p=>[p.id,p.name])],prefs.packs.some(p=>p.id===selected)?selected:'');
    $('packList').replaceChildren(...prefs.packs.map(p=>{const row=element('div',undefined,'saved-row');row.append(element('span',`${p.name} · ${p.items.length}件`),button('書き出す',()=>downloadJson(p,`${p.id}.json`),'text-button'),button('外す',()=>{if(!confirm(`「${p.name}」をこのブラウザから外しますか？保存済み作品の設定は残ります。`))return;const next=clone(prefs);next.packs=next.packs.filter(x=>x.id!==p.id);if(persist(next)){refreshEntries();refreshPackUI();renderCatalog();$('outfitCandidate').hidden=true;candidate=null;}},'text-button'));return row;}));
    $('excludedList').replaceChildren(...prefs.excluded.map(id=>{const row=element('div',undefined,'saved-row');row.append(element('span',entries.find(e=>e.id===id)?.name||id),button('戻す',()=>{const next=clone(prefs);next.excluded=next.excluded.filter(x=>x!==id);if(persist(next))refreshPackUI();},'text-button'));return row;}));
  }
  function renderPresets(){$('presetList').replaceChildren(...prefs.presets.map((p,i)=>{const row=element('div',undefined,'saved-row');row.append(element('span',p.name),button('呼び出す',()=>{if(!confirm('今の制作設定を、この控えに置き換えますか？'))return;restore(p.snapshot);presets.close();notify('設定を呼び出しました。');},'text-button'),button('削除',()=>{if(!confirm('この設定の控えを削除しますか？'))return;const next=clone(prefs);next.presets.splice(i,1);if(persist(next))renderPresets();},'text-button'));return row;}));}
  options($('wardrobeCategory'),[['','すべての種類'],...Object.entries(SHELF_LABEL)],'');refreshPackUI();
  $('openWardrobe').onclick=()=>{renderCatalog();wardrobe.showModal();$('wardrobeQuery').focus();};
  for(const id of ['wardrobeQuery','wardrobeMood'])$(id).oninput=()=>{limit=24;renderCatalog();};
  for(const id of ['wardrobeCategory','wardrobeFavorites','wardrobePack'])$(id).onchange=()=>{limit=24;renderCatalog();};
  $('clearWardrobeFilters').onclick=()=>{for(const id of ['wardrobeQuery','wardrobeMood','wardrobeCategory','wardrobePack'])$(id).value='';$('wardrobeFavorites').checked=false;limit=24;renderCatalog();};
  $('wardrobeMore').onclick=()=>{limit+=24;renderCatalog();};
  $('candidateDetail').onchange=()=>{$('candidateDescription').textContent=$('candidateDetail').value;};
  $('candidateUse').onclick=()=>{if(!candidate)return;apply({id:candidate.id,name:candidate.name,category:candidate.category,palette:$('candidatePalette').value,detail:$('candidateDetail').value});wardrobe.close();};
  $('clearOutfit').onclick=()=>{checkpoint();outfit=null;renderOutput();};
  $('studioMode').onchange=()=>{checkpoint();axes.mode=$('studioMode').value;renderGroups();};
  $('studioFinish').onchange=()=>{checkpoint();axes.finish=$('studioFinish').value;renderOutput();};
  $('studioVerbosity').onchange=()=>{checkpoint();axes.verbosity=$('studioVerbosity').value;renderOutput();};
  $('studioUndo').onclick=()=>{if(!undo)return;const previous=undo;undo=null;axes=previous.axes;outfit=previous.outfit;$('studioUndo').disabled=true;renderGroups();$('suggestions').replaceChildren();};
  $('studioReset').onclick=()=>{if(!confirm('今の制作設定を最初に戻しますか？保存した控えと衣装パックは残ります。'))return;checkpoint();axes=defaults();outfit=null;renderGroups();$('suggestions').replaceChildren();};
  const copyOutput=()=>copy($('studioOutput').textContent);$('studioCopy').onclick=copyOutput;$('studioDockCopy').onclick=copyOutput;
  $('studioJump').onclick=()=>{$('studioPreview').scrollIntoView({block:'start',behavior:'instant'});$('studioPreview').focus({preventScroll:true});};
  $('studioUse').onclick=()=>onUse($('studioOutput').textContent,snapshot());
  $('suggestOutfits').onclick=()=>{const locks={motif:$('lockMotif').checked,palette:$('lockPalette').checked,detail:$('lockDetail').checked};const pool=searchEntries(entries,{category:$('wardrobeCategory').value});
    const ideas=suggestions(pool,outfit,locks,prefs.excluded);const box=$('suggestions');box.replaceChildren();
    if(!ideas.length){box.append(element('p','条件に合う別案がありません。残す部分や種類を変えてみてください。提案から外した衣装は、自動では戻しません。'));return;}
    for(const idea of ideas){const c=element('article',undefined,'suggestion-card');c.append(element('h3',idea.label),element('strong',idea.outfit.name),element('p',idea.outfit.palette),element('p',idea.outfit.detail),element('small',`${idea.changes.join('・')}を変える`),button('この案を採用',()=>apply(idea.outfit)),button('この衣装は提案から外す',()=>{const next=clone(prefs);next.excluded=[...new Set([...next.excluded,idea.outfit.id])];if(persist(next)){box.replaceChildren();refreshPackUI();notify('提案から外しました。「衣装を選ぶ」の管理欄で戻せます。');}},'text-button'));box.append(c);}
  };
  $('packFile').onchange=async e=>{imported=null;$('packConfirm').hidden=true;const box=$('packReview');box.replaceChildren();const file=e.target.files[0];if(!file)return;
    try{if(file.size>PACK_LIMIT)throw Error('ファイルは2MBまでです。');const raw=JSON.parse((await file.text()).replace(/^\uFEFF/,''));const pack=validatePack(raw);const conflict=prefs.packs.some(p=>p.id===pack.id);const names=new Set(entries.map(x=>x.name));const same=pack.items.filter(x=>names.has(x.name)).length;
      box.append(element('strong',`${pack.name} · ${pack.items.length}件`),element('p',`追加 ${conflict?0:pack.items.length}件 / 同名 ${same}件 / パックID重複 ${conflict?1:0}件`));
      if(conflict)box.append(element('p','同じIDのパックがあります。上書きはしません。別版は新しいパックIDにしてください。'));
      const details=element('details');details.append(element('summary','取り込む衣装をすべて確認'));for(const item of pack.items){const row=element('article',undefined,'pack-review-item');row.append(element('strong',item.name),element('p',item.palettes.join(' / ')),element('p',item.details.join('\n')));details.append(row);}box.append(details);
      if(!conflict){imported=pack;$('packConfirm').hidden=false;}
    }catch(error){box.textContent=`取り込めません: ${error.message}`;}finally{e.target.value='';}
  };
  $('packConfirm').onclick=()=>{if(!imported)return;const next=clone(prefs);if(next.packs.some(p=>p.id===imported.id))return;next.packs.push(imported);if(!persist(next))return;refreshEntries();refreshPackUI();renderCatalog();$('packReview').textContent=`${imported.name}を追加しました。このブラウザに保存済みです。`;$('packConfirm').hidden=true;imported=null;};
  $('studioPresets').onclick=()=>{renderPresets();presets.showModal();};
  $('presetSave').onclick=()=>{const name=$('presetName').value.trim();if(!name){notify('設定の名前を入力してください。',true);return;}if(prefs.presets.length>=30){notify('控えは30件までです。不要な控えを削除してください。',true);return;}const next=clone(prefs);next.presets.unshift({name,snapshot:snapshot()});if(persist(next)){renderPresets();notify('このブラウザに設定を保存しました。');}};
  $('presetExport').onclick=()=>downloadJson(snapshot(),'atelier-settings.json');
  $('presetImport').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>PACK_LIMIT)throw Error('設定ファイルが大きすぎます。');const valid=validateSnapshot(JSON.parse(await f.text()));if(confirm('このファイルの設定を呼び出しますか？今の設定は「ひとつ戻す」で戻せます。')){restore(valid);presets.close();notify('設定を呼び出しました。');}}catch(error){notify(error.message,true);}finally{e.target.value='';}};
  renderGroups();
  return {snapshot,restore,reset(){axes=defaults();outfit=null;undo=null;$('studioUndo').disabled=true;renderGroups();$('suggestions').replaceChildren();}};
}
