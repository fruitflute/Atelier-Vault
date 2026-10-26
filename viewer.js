// Image-only viewing: no record mutations; original files are loaded on demand.
export function createViewer({loadImage}) {
  const dialog=document.createElement('dialog');dialog.id='artworkViewer';dialog.className='artwork-viewer';dialog.setAttribute('aria-labelledby','viewerTitle');
  dialog.innerHTML=`<header class="viewer-bar"><div class="viewer-heading"><h2 id="viewerTitle"></h2><span id="viewerCount" aria-live="polite"></span></div><button id="viewerExpand" type="button" aria-label="ブラウザも全画面にする" title="ブラウザも全画面にする">⛶</button><button id="viewerClose" type="button" aria-label="鑑賞を閉じる">×</button></header><div id="viewerImage" class="viewer-stage" aria-busy="false"></div><footer class="viewer-controls"><button id="viewerPrevious" type="button" aria-label="前の画像">← 前へ</button><p id="viewerStatus" role="status"></p><button id="viewerNext" type="button" aria-label="次の画像">次へ →</button></footer>`;
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id);
  let items=[],index=0,token=0,ownsFullscreen=false,requestingFullscreen=false,opener=null,screenNotice='';
  async function render(){const current=items[index];if(!current)return;const version=++token;
    $('viewerTitle').textContent=current.record.title;$('viewerCount').textContent=`${index+1} / ${items.length}枚 · この作品の${current.imageIndex+1}枚目`;
    $('viewerPrevious').disabled=index===0;$('viewerNext').disabled=index===items.length-1;
    const holder=$('viewerImage');holder.replaceChildren();holder.setAttribute('aria-busy','true');$('viewerStatus').textContent='画像を読み込んでいます…';
    try{const url=await loadImage(current.image);if(version!==token||!dialog.open)return;if(!url)throw Error('画像がありません');
      const image=new Image();image.alt=`${current.record.title} · ${current.imageIndex+1}枚目`;image.src=url;
      await image.decode();if(version!==token||!dialog.open)return;holder.replaceChildren(image);$('viewerStatus').textContent=screenNotice;
    }catch{if(version===token&&dialog.open){$('viewerStatus').textContent='画像を読み込めませんでした。';const retry=document.createElement('button');retry.type='button';retry.textContent='もう一度読み込む';retry.addEventListener('click',render);holder.replaceChildren(retry);}}
    finally{if(version===token)holder.setAttribute('aria-busy','false');}
  }
  function move(delta){const next=index+delta;if(next<0||next>=items.length)return;index=next;render();}
  function close(){if(dialog.open)dialog.close();}
  $('viewerPrevious').onclick=()=>move(-1);$('viewerNext').onclick=()=>move(1);$('viewerClose').onclick=close;
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}});
  $('viewerExpand').hidden=!document.fullscreenEnabled;
  $('viewerExpand').onclick=async()=>{
    if(requestingFullscreen)return;
    if(document.fullscreenElement){await document.exitFullscreen().catch(()=>{});return;}
    requestingFullscreen=true;
    try{await document.documentElement.requestFullscreen();ownsFullscreen=true;if(!dialog.open){ownsFullscreen=false;await document.exitFullscreen().catch(()=>{});}}
    catch{screenNotice='この環境ではブラウザの全画面にできません。画面内の鑑賞表示で続けられます。';$('viewerStatus').textContent=screenNotice;}
    finally{requestingFullscreen=false;}
  };
  document.addEventListener('fullscreenchange',()=>{const expanded=!!document.fullscreenElement;const label=expanded?'ブラウザの全画面を解除':'ブラウザも全画面にする';$('viewerExpand').setAttribute('aria-label',label);$('viewerExpand').title=label;if(!expanded)ownsFullscreen=false;});
  dialog.addEventListener('close',()=>{token++;items=[];$('viewerImage').replaceChildren();if(ownsFullscreen&&document.fullscreenElement){ownsFullscreen=false;document.exitFullscreen().catch(()=>{});}if(opener?.isConnected)opener.focus();});
  return {close,open(records,recordId,imageIndex=0){
    screenNotice='';items=records.flatMap(record=>record.images.map((image,i)=>({record,image,imageIndex:i})));if(!items.length)return;
    index=Math.max(0,items.findIndex(x=>x.record.id===recordId&&x.imageIndex===imageIndex));opener=document.activeElement;dialog.showModal();$('viewerClose').focus();render();
  }};
}
