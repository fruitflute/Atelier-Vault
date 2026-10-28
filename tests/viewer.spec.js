import {test,expect} from '@playwright/test';
test('gallery viewer follows filtering, keyboard navigation and returns focus',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('.work-card')).toHaveCount(2);await page.locator('#galleryViewBtn').click();await expect(page.locator('#artworkViewer')).toBeVisible();await expect(page.locator('#viewerImage img')).toBeVisible();await expect(page.locator('#viewerPrevious')).toBeDisabled();await page.keyboard.press('ArrowRight');await expect(page.locator('#viewerCount')).toContainText('2 / 2');await expect(page.locator('#viewerNext')).toBeDisabled();await page.keyboard.press('Escape');await expect(page.locator('#artworkViewer')).toBeHidden();await expect(page.locator('#galleryViewBtn')).toBeFocused();
 await page.locator('#searchInput').fill('Chromatic');await page.locator('#galleryViewBtn').click();await expect(page.locator('#viewerTitle')).toHaveText('Chromatic Reverie');await expect(page.locator('#viewerCount')).toContainText('1 / 1');await page.locator('#viewerClose').click();await page.locator('#searchInput').fill('nothing-matches');await expect(page.locator('#galleryViewBtn')).toBeDisabled();expect(errors).toEqual([]);
});
test('detail viewer returns to details and fits every viewport without cropping',async({page})=>{
 await page.goto('/');await page.locator('.work-card').first().click();await page.locator('#detailViewBtn').click();await expect(page.locator('#viewerImage img')).toBeVisible();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:800});await expect(page.locator('#viewerImage img')).toHaveCSS('object-fit','contain');expect(await page.locator('#artworkViewer').evaluate(el=>el.scrollHeight<=el.clientHeight&&el.scrollWidth<=el.clientWidth)).toBe(true);await expect.poll(async()=>{const b=await page.locator('#viewerImage img').boundingBox();return Math.min(Math.abs(b.width-width),Math.abs(b.height-800));}).toBeLessThan(1);const image=await page.locator('#viewerImage img').boundingBox();const stage=await page.locator('#viewerImage').boundingBox();expect(stage.width).toBe(width);expect(stage.height).toBe(800);expect(image.width).toBeLessThanOrEqual(width+1);expect(image.height).toBeLessThanOrEqual(801);expect(Math.min(Math.abs(image.width-width),Math.abs(image.height-800))).toBeLessThan(1);}
 await page.locator('#viewerClose').click();await expect(page.locator('#detailDialog')).toBeVisible();await expect(page.locator('#detailViewBtn')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('#detailDialog')).toBeHidden();
});
test('browser fullscreen failure leaves the viewport viewer usable',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(document,'fullscreenEnabled',{get:()=>true});Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Unavailable'));});
 await page.goto('/');await page.locator('#galleryViewBtn').click();await expect(page.locator('#viewerImage img')).toBeVisible();await page.locator('#viewerExpand').click();await expect(page.locator('#viewerStatus')).toContainText('画面内の鑑賞表示');await page.locator('#viewerNext').click();await expect(page.locator('#viewerCount')).toContainText('2 / 2');await page.locator('#viewerClose').click();await expect(page.locator('#artworkViewer')).toBeHidden();
});

test('detail viewing begins at the selected image in a multi-image work',async({page})=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=','base64');
 await page.goto('/');await page.locator('.hero [data-go="create"]').click();await page.locator('#recordTitle').fill('Two images');await page.locator('#recordPrompt').fill('Test');await page.locator('#fileInput').setInputFiles(['a.png','b.png'].map(name=>({name,mimeType:'image/png',buffer:png})));await page.locator('#saveBtn').click();await expect(page.locator('.work-card')).toHaveCount(3);await page.locator('#searchInput').fill('Two images');await page.locator('.work-card').click();await page.locator('#detailThumbs button').nth(1).click();await page.locator('#detailViewBtn').click();await expect(page.locator('#viewerCount')).toContainText('2 / 2枚');await page.locator('#viewerPrevious').click();await expect(page.locator('#viewerCount')).toContainText('1 / 2枚');await page.locator('#viewerClose').click();await expect(page.locator('#detailThumbs button').nth(1)).toHaveClass('selected');
});


test('fit fills the available edge, fill crops explicitly, actual size and shortcuts work',async({page})=>{
 await page.goto('/');await page.locator('#galleryViewBtn').click();const img=page.locator('#viewerImage img');await expect(img).toBeVisible();
 await page.locator('#viewerMode').selectOption('fill');
 const [b,stage]=await Promise.all([img.boundingBox(),page.locator('#viewerImage').boundingBox()]);expect(b.width+1).toBeGreaterThanOrEqual(stage.width);expect(b.height+1).toBeGreaterThanOrEqual(stage.height);
 await page.locator('#viewerImage').focus();await page.keyboard.press('0');expect(await img.evaluate(el=>Math.abs(el.getBoundingClientRect().width-el.naturalWidth))).toBeLessThan(1);
 await page.keyboard.press('Backslash');await expect(page.locator('#viewerMode')).toHaveValue('fit');
 await page.keyboard.press('+');await expect(page.locator('#viewerMode')).toHaveValue('custom');
 await page.keyboard.press('Escape');await expect(page.locator('#viewerMode')).toHaveValue('fit');await expect(page.locator('#artworkViewer')).toBeVisible();
 await page.keyboard.press('h');await expect(page.locator('#viewerReveal')).toBeVisible();await expect(page.locator('#viewerClose')).toBeHidden();
 await page.locator('#viewerReveal').click();await page.keyboard.press('?');await expect(page.locator('#viewerHelpPanel')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#viewerHelpPanel')).toBeHidden();
 await page.keyboard.press('End');await expect(page.locator('#viewerCount')).toContainText('2 / 2');await page.keyboard.press('Home');await expect(page.locator('#viewerCount')).toContainText('1 / 2');
});

test('touch swipe navigates, pinch zooms, drag pans without changing images',async({page})=>{
 await page.goto('/');await page.locator('#galleryViewBtn').click();await expect(page.locator('#viewerImage img')).toBeVisible();
 const client=await page.context().newCDPSession(page);const box=await page.locator('#viewerImage').boundingBox();const cx=box.width/2,cy=box.height/2;
 const touch=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y],id)=>({x,y,id}))});
 await touch('touchStart',[[cx+70,cy]]);await touch('touchMove',[[cx-70,cy]]);await touch('touchEnd',[]);await expect(page.locator('#viewerCount')).toContainText('2 / 2');await expect(page.locator('#viewerImage img')).toBeVisible();
 await touch('touchStart',[[cx-30,cy],[cx+30,cy]]);await touch('touchMove',[[cx-100,cy],[cx+100,cy]]);await touch('touchEnd',[]);await expect(page.locator('#viewerMode')).toHaveValue('custom');
 const before=await page.locator('#viewerImage img').getAttribute('style');await touch('touchStart',[[cx,cy]]);await touch('touchMove',[[cx+60,cy+60]]);await touch('touchEnd',[]);
 await expect(page.locator('#viewerCount')).toContainText('2 / 2');expect(await page.locator('#viewerImage img').getAttribute('style')).not.toBe(before);
 await page.locator('#viewerMode').selectOption('fit');await touch('touchStart',[[cx,cy]]);await touch('touchEnd',[]);await expect(page.locator('#viewerReveal')).toBeVisible();await page.locator('#viewerReveal').click();
});

test('zoom and controls fit narrow screens and resized viewports',async({page})=>{
 await page.goto('/');await page.locator('#galleryViewBtn').click();await expect(page.locator('#viewerImage img')).toBeVisible();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:800});await page.locator('#viewerMode').selectOption('fit');
  for(const id of ['viewerPrevious','viewerNext','viewerMode','viewerZoomIn','viewerZoomOut','viewerHide','viewerHelp']){const b=await page.locator('#'+id).boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width+1);expect(b.height).toBeGreaterThanOrEqual(44);}
 }
});

test('late image responses cannot replace the selected image or reopen closed viewer',async({page})=>{
 await page.goto('/');
 await page.evaluate(async()=>{
  document.querySelector('#artworkViewer').remove();const {createViewer}=await import('/viewer.js');
  const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="400" fill="pink"/></svg>');
  window.finishLate=null;window.testViewer=createViewer({loadImage:img=>img.slow?new Promise(resolve=>window.finishLate=()=>resolve(image)):Promise.resolve(image)});
  window.testRecords=[{id:'test',title:'Test',images:[{slow:true},{}]}];window.testViewer.open(window.testRecords);
 });
 await page.locator('#viewerNext').click();await expect(page.locator('#viewerImage img')).toHaveAttribute('alt','Test · 2枚目');
 await page.evaluate(()=>window.finishLate());await expect(page.locator('#viewerImage img')).toHaveAttribute('alt','Test · 2枚目');
 await page.locator('#viewerPrevious').click();await page.locator('#viewerClose').click();await page.evaluate(()=>window.finishLate());await expect(page.locator('#artworkViewer')).toBeHidden();await expect(page.locator('#viewerImage img')).toHaveCount(0);
});
