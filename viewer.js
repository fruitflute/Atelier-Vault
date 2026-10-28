// Viewing transforms only: original files and record metadata are never changed.
export function createViewer({loadImage}) {
  const dialog=document.createElement('dialog');dialog.id='artworkViewer';dialog.className='artwork-viewer';dialog.setAttribute('aria-labelledby','viewerTitle');
  dialog.innerHTML=`<div id="viewerImage" class="viewer-stage" aria-busy="false" tabindex="0" aria-label="画像。左右スワイプで切り替え、ピンチで拡大"></div>
  <header class="viewer-bar"><div class="viewer-heading"><h2 id="viewerTitle"></h2><span id="viewerCount" aria-live="polite"></span></div><button id="viewerExpand" type="button" aria-label="ブラウザも全画面にする" title="全画面（F）">⛶</button><button id="viewerClose" type="button" aria-label="鑑賞を閉じる" title="閉じる（Esc）">×</button></header>
  <footer class="viewer-controls"><div class="viewer-navigation"><button id="viewerPrevious" type="button" aria-label="前の画像">← 前へ</button><p id="viewerStatus" role="status"></p><button id="viewerNext" type="button" aria-label="次の画像">次へ →</button></div><div class="viewer-tools"><button id="viewerZoomOut" type="button" aria-label="縮小">−</button><select id="viewerMode" aria-label="画像の表示サイズ"><option value="fit">全体を表示</option><option value="fill">画面を埋める（切り抜き）</option><option value="actual">実寸（100%）</option><option value="custom" disabled>拡大率を調整中</option></select><button id="viewerZoomIn" type="button" aria-label="拡大">＋</button><output id="viewerZoom" aria-label="拡大率"></output><button id="viewerHide" type="button" aria-label="操作欄を隠す" title="操作欄（H）">◉</button><button id="viewerHelp" type="button" aria-label="操作方法" aria-expanded="false">?</button></div></footer>
  <button id="viewerReveal" type="button" hidden aria-label="操作欄を表示">操作を表示</button>
  <aside id="viewerHelpPanel" hidden aria-label="画像閲覧の操作方法"><strong>画像を楽しむ操作</strong><p>← / →：前後の画像　Home / End：最初 / 最後<br>＋ / −：拡大 / 縮小　\\：全体を表示　0：実寸<br>W A S D：拡大した画像を移動<br>F：ブラウザ全画面　H：操作欄　?：この案内<br>Esc：案内を閉じる → 拡大を戻す → 鑑賞を閉じる</p><p>スマホ：左右スワイプで画像切り替え。ピンチで拡大・縮小、拡大中はドラッグで移動。中央タップで操作欄、ダブルタップで拡大／全体表示。</p><p>PC：ホイールで拡大・縮小、ドラッグで移動、ダブルクリックで拡大／全体表示。実寸は画像1ピクセル＝CSSの1ピクセルです。</p><button id="viewerHelpClose" type="button">案内を閉じる</button></aside>`;
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id),stage=$('viewerImage');
  let items=[],index=0,token=0,ownsFullscreen=false,requestingFullscreen=false,opener=null,screenNotice='';
  let picture=null,scale=1,x=0,y=0,mode='fit',hidden=false,lastTap=0;
  const pointers=new Map();let gesture=null;
  const bounds=()=>stage.getBoundingClientRect();
  const fit=()=>picture?Math.min(stage.clientWidth/picture.naturalWidth,stage.clientHeight/picture.naturalHeight):1;
  function paint(){if(!picture)return;const w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;
    x=Math.max(-Math.max(0,(w-stage.clientWidth)/2),Math.min(Math.max(0,(w-stage.clientWidth)/2),x));
    y=Math.max(-Math.max(0,(h-stage.clientHeight)/2),Math.min(Math.max(0,(h-stage.clientHeight)/2),y));
    Object.assign(picture.style,{width:w+'px',height:h+'px',transform:`translate(-50%,-50%) translate(${x}px,${y}px)`});
    stage.classList.toggle('zoomed',w>stage.clientWidth+1||h>stage.clientHeight+1);
    $('viewerZoom').textContent=Math.round(scale*100)+'%';$('viewerMode').value=mode;
  }
  function setMode(next){mode=next;x=0;y=0;if(!picture)return;
    scale=next==='actual'?1:next==='fill'?Math.max(stage.clientWidth/picture.naturalWidth,stage.clientHeight/picture.naturalHeight):fit();paint();
  }
  function zoom(factor,cx=stage.clientWidth/2,cy=stage.clientHeight/2){if(!picture)return;const old=scale;scale=Math.max(Math.min(fit()/4,1),Math.min(Math.max(8,fit()*8),scale*factor));
    x=(x-(cx-stage.clientWidth/2))*scale/old+(cx-stage.clientWidth/2);y=(y-(cy-stage.clientHeight/2))*scale/old+(cy-stage.clientHeight/2);mode='custom';paint();
  }
  function controls(value){hidden=value;dialog.classList.toggle('viewer-clean',hidden);$('viewerReveal').hidden=!hidden;
    $('viewerHelpPanel').hidden=true;$('viewerHelp').setAttribute('aria-expanded','false');
    if(hidden)stage.focus({preventScroll:true});
  }
  function help(value){if(hidden)controls(false);$('viewerHelpPanel').hidden=!value;$('viewerHelp').setAttribute('aria-expanded',String(value));if(value)$('viewerHelpClose').focus();else $('viewerHelp').focus();}
  function resetGestures(){pointers.clear();gesture=null;lastTap=0;}
  async function render(){const current=items[index];if(!current)return;const version=++token;resetGestures();picture=null;
    $('viewerTitle').textContent=current.record.title;$('viewerCount').textContent=`${index+1} / ${items.length}枚 · この作品の${current.imageIndex+1}枚目`;
    $('viewerPrevious').disabled=index===0;$('viewerNext').disabled=index===items.length-1;
    stage.replaceChildren();stage.setAttribute('aria-busy','true');$('viewerStatus').textContent='画像を読み込んでいます…';$('viewerZoom').textContent='';
    try{const url=await loadImage(current.image);if(version!==token||!dialog.open)return;if(!url)throw Error('画像がありません');
      const image=new Image();image.alt=`${current.record.title} · ${current.imageIndex+1}枚目`;image.draggable=false;image.src=url;
      await image.decode();if(version!==token||!dialog.open)return;picture=image;stage.replaceChildren(image);setMode(mode==='fill'?'fill':'fit');$('viewerStatus').textContent=screenNotice;
    }catch{if(version===token&&dialog.open){controls(false);$('viewerStatus').textContent='画像を読み込めませんでした。';const retry=document.createElement('button');retry.type='button';retry.textContent='もう一度読み込む';retry.addEventListener('click',render);stage.replaceChildren(retry);}}
    finally{if(version===token)stage.setAttribute('aria-busy','false');}
  }
  function move(delta){const next=index+delta;if(next<0||next>=items.length)return;index=next;render();}
  function close(){if(dialog.open)dialog.close();}
  function escape(event){event.preventDefault();if(!$('viewerHelpPanel').hidden)help(false);else if(picture&&(mode!=='fit'||x||y))setMode('fit');else close();}
  $('viewerPrevious').onclick=()=>move(-1);$('viewerNext').onclick=()=>move(1);$('viewerClose').onclick=close;
  $('viewerZoomIn').onclick=()=>zoom(1.25);$('viewerZoomOut').onclick=()=>zoom(0.8);$('viewerMode').onchange=()=>setMode($('viewerMode').value);
  $('viewerHide').onclick=()=>controls(true);$('viewerReveal').onclick=()=>{controls(false);$('viewerHide').focus();};$('viewerHelp').onclick=()=>help($('viewerHelpPanel').hidden);$('viewerHelpClose').onclick=()=>help(false);
  dialog.addEventListener('cancel',escape);
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'){escape(event);return;}
    if(event.ctrlKey||event.metaKey||event.altKey||event.target.matches('select,input,textarea')||event.target.isContentEditable)return;
    if(!$('viewerHelpPanel').hidden)return;
    const key=event.key.toLowerCase();let handled=true;
    if(key==='arrowleft')move(-1);else if(key==='arrowright')move(1);
    else if(key==='home'){index=0;render();}else if(key==='end'){index=items.length-1;render();}
    else if(key==='+'||key==='=')zoom(1.25);else if(key==='-')zoom(0.8);
    else if(key==='\\')setMode('fit');else if(key==='0')setMode('actual');
    else if(key==='h')controls(!hidden);else if(key==='f')$('viewerExpand').click();else if(key==='?')help(true);
    else if(['w','a','s','d'].includes(key)){x+=key==='a'?80:key==='d'?-80:0;y+=key==='w'?80:key==='s'?-80:0;paint();}
    else handled=false;if(handled)event.preventDefault();
  });
  stage.addEventListener('wheel',event=>{if(!picture||!$('viewerHelpPanel').hidden)return;event.preventDefault();const b=bounds();zoom(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*0.005),event.clientX-b.left,event.clientY-b.top);},{passive:false});
  stage.addEventListener('dblclick',event=>{if(event.pointerType==='touch'||!picture)return;const b=bounds();if(mode!=='fit')setMode('fit');else zoom(2,event.clientX-b.left,event.clientY-b.top);});
  stage.addEventListener('pointerdown',event=>{
    if(!picture||event.button!==0||event.target.closest('button'))return;
    stage.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1)gesture={startX:event.clientX,startY:event.clientY,x,y,pan:stage.classList.contains('zoomed'),moved:false,pinch:false};
    else if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={pinch:true,dist:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};}
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!gesture)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,box=bounds();
      if(gesture.dist>0)zoom(dist/gesture.dist,gesture.cx-box.left,gesture.cy-box.top);x+=cx-gesture.cx;y+=cy-gesture.cy;paint();Object.assign(gesture,{dist,cx,cy});
    }else if(!gesture.pinch){const dx=event.clientX-gesture.startX,dy=event.clientY-gesture.startY;if(Math.hypot(dx,dy)>8)gesture.moved=true;if(gesture.pan){x=gesture.x+dx;y=gesture.y+dy;paint();}}
  });
  function endPointer(event){if(!pointers.has(event.pointerId))return;const g=gesture;pointers.delete(event.pointerId);if(event.type==='pointercancel'){resetGestures();return;}if(!g||g.pinch){if(!pointers.size)gesture=null;return;}
    const dx=event.clientX-g.startX,dy=event.clientY-g.startY;
    if(!g.pan&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){move(dx<0?1:-1);}
    else if(!g.moved&&event.pointerType==='touch'){const now=performance.now();if(lastTap&&now-lastTap<300){if(mode!=='fit')setMode('fit');else {const b=bounds();zoom(2,event.clientX-b.left,event.clientY-b.top);}lastTap=0;}else{lastTap=now;controls(!hidden);}}
    gesture=null;
  }
  stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);
  new ResizeObserver(()=>{if(!picture||!dialog.open)return;if(mode==='fit'||mode==='fill')setMode(mode);else paint();}).observe(stage);
  $('viewerExpand').hidden=!document.fullscreenEnabled;
  $('viewerExpand').onclick=async()=>{
    if(requestingFullscreen||!document.fullscreenEnabled)return;
    if(document.fullscreenElement){await document.exitFullscreen().catch(()=>{});return;}
    requestingFullscreen=true;
    try{await document.documentElement.requestFullscreen();ownsFullscreen=true;if(!dialog.open){ownsFullscreen=false;await document.exitFullscreen().catch(()=>{});}}
    catch{screenNotice='この環境ではブラウザの全画面にできません。画面内の鑑賞表示で続けられます。';controls(false);$('viewerStatus').textContent=screenNotice;}
    finally{requestingFullscreen=false;}
  };
  document.addEventListener('fullscreenchange',()=>{const expanded=!!document.fullscreenElement;const label=expanded?'ブラウザの全画面を解除':'ブラウザも全画面にする';$('viewerExpand').setAttribute('aria-label',label);$('viewerExpand').title=label+'（F）';if(!expanded)ownsFullscreen=false;});
  dialog.addEventListener('close',()=>{token++;items=[];picture=null;resetGestures();stage.replaceChildren();if(ownsFullscreen&&document.fullscreenElement){ownsFullscreen=false;document.exitFullscreen().catch(()=>{});}if(opener?.isConnected)opener.focus();});
  return {close,open(records,recordId,imageIndex=0){
    screenNotice='';mode='fit';controls(false);items=records.flatMap(record=>record.images.map((image,i)=>({record,image,imageIndex:i})));if(!items.length)return;
    index=Math.max(0,items.findIndex(v=>v.record.id===recordId&&v.imageIndex===imageIndex));opener=document.activeElement;dialog.showModal();$('viewerClose').focus();render();
  }};
}
