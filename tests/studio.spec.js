import {test,expect} from '@playwright/test';import fs from 'node:fs';
const pack=JSON.parse(fs.readFileSync(new URL('../packs/example.json',import.meta.url)));
// Use the valid tiny image already used by the gallery suite.
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=','base64');
async function studio(page){await page.goto('/');await page.locator('[data-view="studio"]').filter({visible:true}).click();await expect(page.locator('#studioOutput')).not.toBeEmpty();}
async function closet(page){await page.locator('#openWardrobe').click();await expect(page.locator('#wardrobeDialog')).toBeVisible();}
async function reviewPack(page,value=pack){if(await page.locator('.pack-manager').getAttribute('open')===null)await page.locator('.pack-manager>summary').click();await page.locator('#packFile').setInputFiles({name:'wardrobe.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});}
test('find by name, favorite, select palette, and preserve manual notes',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await studio(page);
 await page.locator('#studio-AX-11').fill('手書きのメモを残す');await closet(page);
 await page.locator('#wardrobeQuery').fill('コルセット');await expect(page.locator('.outfit-name').first()).toContainText('コルセット');
 const name=await page.locator('.outfit-name').first().innerText();await page.locator('.outfit-favorite').first().click();await expect(page.locator('.outfit-favorite').first()).toBeFocused();await page.locator('#wardrobeFavorites').check();await expect(page.locator('.outfit-name')).toHaveCount(1);
 await page.locator('.outfit-name').click();await page.locator('#candidatePalette').selectOption({index:1});const palette=await page.locator('#candidatePalette').inputValue();await page.locator('#candidateUse').click();
 await expect(page.locator('#chosenOutfit')).toContainText(name);await expect(page.locator('#studioOutput')).toContainText(palette);await expect(page.locator('#studioOutput')).toContainText('手書きのメモを残す');
 await page.reload();await page.locator('[data-view="studio"]').filter({visible:true}).click();await closet(page);await page.locator('#wardrobeFavorites').check();await expect(page.locator('.outfit-name')).toHaveCount(1);expect(errors).toEqual([]);
});
test('suggestions leave draft untouched until adoption and undo restores it',async({page})=>{
 await studio(page);await page.locator('.inspiration>summary').click();const before=await page.locator('#studioOutput').innerText();await page.locator('#suggestOutfits').click();await expect(page.locator('.suggestion-card').first()).toBeVisible();await expect(page.locator('#studioOutput')).toHaveText(before);
 await page.locator('.suggestion-card').first().getByRole('button',{name:'この案を採用',exact:true}).click();await expect(page.locator('#studioOutput')).not.toHaveText(before);await page.locator('#studioUndo').click();await expect(page.locator('#studioOutput')).toHaveText(before);
});
test('pack preview, import, duplicate rejection and persistence are explicit',async({page})=>{
 await studio(page);await closet(page);await reviewPack(page);await expect(page.locator('#packReview')).toContainText('追加 1件');await expect(page.locator('#wardrobeCount')).toContainText('全419件');await page.locator('#packConfirm').click();await expect(page.locator('#wardrobeCount')).toContainText('全420件');
 await page.locator('#packFile').setInputFiles({name:'same.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});await expect(page.locator('#packReview')).toContainText('パックID重複 1件');await expect(page.locator('#packConfirm')).toBeHidden();
 await page.reload();await page.locator('[data-view="studio"]').filter({visible:true}).click();await closet(page);await page.locator('#wardrobeQuery').fill('春色のリボン');await expect(page.locator('.outfit-name')).toHaveCount(1);
 await page.locator('.wardrobe-more>summary').click();await page.locator('#wardrobeMood').fill('ラベンダー');await expect(page.locator('.outfit-name')).toHaveCount(1);await page.locator('#wardrobeMood').fill('存在しない素材');await expect(page.locator('.outfit-name')).toHaveCount(0);
});
test('invalid packs and hostile-looking names are handled as data',async({page})=>{
 await studio(page);await closet(page);const bad=structuredClone(pack);bad.items[0].category='X';await reviewPack(page,bad);await expect(page.locator('#packReview')).toContainText('取り込めません');await expect(page.locator('#packConfirm')).toBeHidden();
 const text=structuredClone(pack);text.name='<img src=x onerror=alert(1)>';await page.locator('#packFile').setInputFiles({name:'text.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(text))});await expect(page.locator('#packReview')).toContainText(text.name);await expect(page.locator('#packReview img')).toHaveCount(0);
});
test('saved work restores source settings after the wardrobe pack is removed',async({page})=>{
 await studio(page);await closet(page);await reviewPack(page);await page.locator('#packConfirm').click();await page.locator('#wardrobeQuery').fill('春色のリボン');await page.locator('.outfit-name').click();await page.locator('#candidateUse').click();await page.locator('#studio-AX-05').fill('春の記録');
 await page.locator('#studioUse').click();await expect(page.locator('#draftStudioNotice')).toBeVisible();await page.locator('#recordTitle').fill('衣装設定の記録');await page.locator('#fileInput').setInputFiles({name:'image.png',mimeType:'image/png',buffer:image});await page.locator('#saveBtn').click();await expect(page.locator('.work-card')).toHaveCount(3);
 await page.locator('[data-view="studio"]').filter({visible:true}).click();await closet(page);if(await page.locator('.pack-manager').getAttribute('open')===null)await page.locator('.pack-manager>summary').click();page.once('dialog',d=>d.accept());await page.locator('#packList').getByRole('button',{name:'外す',exact:true}).click();await expect(page.locator('#wardrobeCount')).toContainText('全419件');await page.locator('#wardrobeDialog .close-icon').click();
 await page.locator('#studio-AX-05').fill('変更後');await page.locator('[data-view="gallery"]').filter({visible:true}).click();await page.locator('#searchInput').fill('衣装設定の記録');await page.locator('.work-card').click();page.once('dialog',d=>d.accept());await page.locator('#restoreStudioBtn').click();await expect(page.locator('#studio-AX-05')).toHaveValue('春の記録');await expect(page.locator('#chosenOutfit')).toContainText('春色のリボン');
});
test('preset persistence, advanced controls and responsive keyboard navigation',async({page})=>{
 await studio(page);await expect(page.locator('#studio-AX-19')).toHaveCount(0);await page.locator('#studioMode').selectOption('advanced');await expect(page.locator('#studio-AX-19')).toHaveCount(1);
 await page.locator('#studio-AX-05').fill('設定の控え');await page.locator('#studioPresets').click();await page.locator('#presetName').fill('朝の設定');await page.locator('#presetSave').click();await page.locator('#presetDialog .close-icon').click();await page.reload();await page.locator('[data-view="studio"]').filter({visible:true}).click();await page.locator('#studioPresets').click();page.once('dialog',d=>d.accept());await page.locator('#presetList').getByRole('button',{name:'呼び出す'}).click();await expect(page.locator('#studio-AX-05')).toHaveValue('設定の控え');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await closet(page);expect(await page.locator('#wardrobeDialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.keyboard.press('Escape');await expect(page.locator('#wardrobeDialog')).not.toBeVisible();await expect(page.locator('#openWardrobe')).toBeFocused();}
});

test('MEGA record roundtrip retains studio settings through disconnect and reconnect',async({page})=>{
 await page.route('**/vendor/megajs-1.3.10.mjs',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('./mega-mock.js',import.meta.url),'utf8')}));
 await page.goto('/');
 const login=async()=>{await page.locator('#connectBtn').click();await page.locator('#loginEmail').fill('test@example.com');await page.locator('#loginPassword').fill('fixture');await page.locator('#loginSubmit').click();await expect(page.locator('#connectionBadge')).toContainText('MEGA接続中');await expect(page.locator('#busyOverlay')).toBeHidden();};
 await login();await page.locator('[data-view="studio"]').filter({visible:true}).click();await page.locator('#studio-AX-05').fill('クラウドから呼び戻す設定');await page.locator('#studioUse').click();await page.locator('#recordTitle').fill('Cloud settings');await page.locator('#fileInput').setInputFiles({name:'image.png',mimeType:'image/png',buffer:image});await page.locator('#saveBtn').click();await expect(page.locator('.work-card')).toHaveCount(1);
 page.once('dialog',d=>d.accept());await page.locator('#connectBtn').click();await expect(page.locator('#connectionBadge')).toContainText('デモモード');await expect(page.locator('#busyOverlay')).toBeHidden();await login();await page.locator('.work-card').click();page.once('dialog',d=>d.accept());await page.locator('#restoreStudioBtn').click();await expect(page.locator('#studio-AX-05')).toHaveValue('クラウドから呼び戻す設定');
});

test('finish switches, undoes and survives preset and work restore',async({page})=>{
 await studio(page);await expect(page.locator('#studioFinish')).toHaveValue('selfie');const before=await page.locator('#studioOutput').innerText();
 await page.locator('#studioFinish').selectOption('professional');await expect(page.locator('#studioOutput')).toContainText('プロフェッショナルな写真作品');await expect(page.locator('#studioOutput')).not.toContainText('実際のスマホ写真らしい不完全さ');await page.locator('#studioUndo').click();await expect(page.locator('#studioFinish')).toHaveValue('selfie');await expect(page.locator('#studioOutput')).toHaveText(before);
 await page.locator('#studioFinish').selectOption('professional');await page.locator('#studioPresets').click();await page.locator('#presetName').fill('プロ仕上げ');await page.locator('#presetSave').click();await page.locator('#presetDialog .close-icon').click();await page.reload();await page.locator('[data-view="studio"]').filter({visible:true}).click();await page.locator('#studioPresets').click();page.once('dialog',d=>d.accept());await page.locator('#presetList').getByRole('button',{name:'呼び出す'}).click();await expect(page.locator('#studioFinish')).toHaveValue('professional');
 await page.locator('#studioUse').click();await page.locator('#recordTitle').fill('仕上がりの記録');await page.locator('#fileInput').setInputFiles({name:'image.png',mimeType:'image/png',buffer:image});await page.locator('#saveBtn').click();await expect(page.locator('.work-card')).toHaveCount(3);await page.locator('#searchInput').fill('仕上がりの記録');await page.locator('.work-card').click();page.once('dialog',d=>d.accept());await page.locator('#restoreStudioBtn').click();await expect(page.locator('#studioFinish')).toHaveValue('professional');
});

test('copy remains within reach on portrait tablet and narrow desktop',async({page})=>{
 for(const width of [390,768,1023,1440]){
  await page.setViewportSize({width,height:900});await studio(page);
  const copy=page.locator(width<=1023?'#studioDockCopy':'#studioCopy');
  await expect(copy).toBeInViewport();
  await page.locator('#studio-AX-11').fill('画面の途中からコピー');
  await expect(copy).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

test('clothing begins before management and detail order follows scene before camera',async({page})=>{
 await studio(page);
 expect(await page.locator('#openWardrobe').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#studioMode')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 const controls=await page.locator('#axisGroups .axis-group').first().locator('select,textarea,fieldset').evaluateAll(els=>els.map(el=>el.id||el.querySelector('input')?.id));
 expect(controls.indexOf('studio-AX-11')).toBeLessThan(controls.indexOf('studio-AX-09'));
 await page.locator('#studioMode').selectOption('advanced');
 const summaries=await page.locator('#axisGroups>.axis-group>summary').allTextContents();
 expect(summaries.indexOf('場所・時')).toBeLessThan(summaries.indexOf('構図・撮影'));
 await page.locator('#studioFinish').selectOption('professional');
 await expect(page.locator('#studioOutput')).toContainText('【手と接触】');
});
