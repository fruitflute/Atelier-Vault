import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=', 'base64');
async function fillWork(page, title = 'Test work') {
  await page.locator('.hero [data-go="create"]').click();
  await page.locator('#recordTitle').fill(title);
  await page.locator('#recordPrompt').fill('A quiet landscape <script>alert(1)</script>');
  await page.locator('#recordTags').fill('landscape, test');
  await page.locator('#fileInput').setInputFiles({ name: 'image.png', mimeType: 'image/png', buffer: png });
}
async function mockMega(page) {
  await page.route('**/vendor/megajs-1.3.10.mjs', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync(new URL('./mega-mock.js', import.meta.url), 'utf8'),
  }));
}
async function login(page, password = 'test-password') {
  await page.locator('#connectBtn').click();
  await page.locator('#loginEmail').fill('test@example.com');
  await page.locator('#loginPassword').fill(password);
  await page.locator('#loginSubmit').click();
}
test('demo: create, search, details, reuse and delete', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.work-card')).toHaveCount(2);
  await fillWork(page);
  await page.locator('#saveBtn').click();
  await expect(page.locator('.work-card')).toHaveCount(3);
  await page.locator('#searchInput').fill('Test work');
  await expect(page.locator('.work-card')).toHaveCount(1);
  await page.locator('.work-card').click();
  await expect(page.locator('#detailPrompt')).toHaveText('A quiet landscape <script>alert(1)</script>');
  await expect(page.locator('#detailImageHolder img')).toBeVisible();
  await page.locator('#reuseBtn').click();
  await expect(page.locator('#recordPrompt')).toHaveValue('A quiet landscape <script>alert(1)</script>');
  await page.locator('.nav-item[data-view="gallery"], .mobile-nav-item[data-view="gallery"]').filter({ visible: true }).click();
  await page.locator('.work-card').click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#deleteBtn').click();
  await expect(page.locator('.work-card')).toHaveCount(0);
  await page.locator('#searchInput').fill('');
  await expect(page.locator('.work-card')).toHaveCount(2);
  expect(errors).toEqual([]);
});
test('real vendored SDK loads locally and layout fits', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.work-card')).toHaveCount(2);
  expect(await page.evaluate(async () => typeof (await import('./vendor/megajs-1.3.10.mjs')).Storage)).toBe('function');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('MEGA adapter: commit last, synchronize, reconnect, trash explicitly', async ({ page }) => {
  await mockMega(page); await page.goto('/'); await login(page);
  await expect(page.locator('#connectionBadge')).toContainText('MEGA接続中');
  await fillWork(page, 'Cloud work'); await page.locator('#saveBtn').click();
  await expect(page.locator('.work-card')).toHaveCount(1);
  const uploads = await page.evaluate(() => window.mockStats.uploads);
  expect(uploads.at(-1)).toBe('record.json');
  expect(uploads).toContain('thumb-01.jpg');
  await page.locator('#refreshBtn').click();
  await expect(page.locator('.work-card')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept()); await page.locator('#connectBtn').click();
  await expect(page.locator('#connectionBadge')).toContainText('デモモード');
  await login(page); await expect(page.locator('.work-card')).toHaveCount(1);
  await page.locator('.work-card').click();
  page.once('dialog', dialog => dialog.accept()); await page.locator('#deleteBtn').click();
  await expect(page.locator('.work-card')).toHaveCount(0);
  expect(await page.evaluate(() => window.mockStats.deletions)).toEqual([false]);
});
test('failed save keeps draft and moves partial folder to trash', async ({ page }) => {
  await mockMega(page); await page.goto('/'); await login(page);
  await expect(page.locator('#connectionBadge')).toContainText('MEGA接続中');
  await fillWork(page); await page.evaluate(() => { window.failUpload = true; });
  await page.locator('#saveBtn').click();
  await expect(page.locator('#toast')).toContainText('保存できませんでした');
  await expect(page.locator('#recordTitle')).toHaveValue('Test work');
  await expect(page.locator('.upload-chip')).toHaveCount(1);
  expect(await page.evaluate(() => window.mockStats.deletions)).toEqual([false]);
});
test('failed login clears password and allows retry', async ({ page }) => {
  await mockMega(page); await page.goto('/'); await login(page, 'fail');
  await expect(page.locator('#toast')).toContainText('MEGAログインに失敗');
  await expect(page.locator('#loginPassword')).toHaveValue('');
  await expect(page.locator('#loginSubmit')).toBeEnabled();
  await expect(page.locator('#connectionBadge')).toContainText('デモモード');
});

async function archivedFixture(page, mode) {
  await page.addInitScript(value => { window.megaFixture=value; }, mode);
  await mockMega(page); await page.goto('/'); await login(page);
  await expect(page.locator('#connectionBadge')).toContainText('MEGA接続中');
  await expect(page.locator('#busyOverlay')).toBeHidden();
}
test('archived records in a second same-name root are discovered', async ({ page }) => {
  await archivedFixture(page,'duplicate');
  await expect(page.locator('.work-card')).toHaveCount(1);
  await expect(page.locator('.work-card')).toContainText('Archived fixture');
  await expect(page.locator('#syncNotice')).toContainText('保存先 2件');
  await expect(page.locator('#syncNotice')).toContainText('表示 1件');
});
test('unreadable stored metadata is an error, never a successful empty gallery', async ({ page }) => {
  await archivedFixture(page,'unreadable');
  await expect(page.locator('#syncNotice')).toContainText('JSON取得失敗 1件');
  await expect(page.locator('#syncNotice')).toHaveClass(/error/);
  await expect(page.locator('#toast')).toContainText('作品の同期に失敗');
  await expect(page.locator('#emptyTitle')).toHaveText('作品をまだ表示できません');
});
test('partial sync distinguishes incomplete uploads from failed reads', async ({ page }) => {
  await archivedFixture(page,'partial');
  await expect(page.locator('.work-card')).toHaveCount(1);
  await expect(page.locator('#syncNotice')).toContainText('JSONなし 1件');
  await expect(page.locator('#syncNotice')).toContainText('JSON取得失敗 1件');
  await expect(page.locator('#syncNotice')).toHaveClass(/warning/);
});
test('failed refresh retains previously displayed records', async ({ page }) => {
  await archivedFixture(page,'normal');
  await expect(page.locator('.work-card')).toHaveCount(1);
  await page.evaluate(() => { window.failReads=true; });
  await page.locator('#refreshBtn').click();
  await expect(page.locator('#syncNotice')).toHaveClass(/error/);
  await expect(page.locator('.work-card')).toHaveCount(1);
  await expect(page.locator('.work-card img')).toBeVisible();
});
test('legacy image entry without MIME type uses its extension', async ({ page }) => {
  await archivedFixture(page,'legacy');
  await expect(page.locator('.work-card')).toContainText('▧ 1');
  await page.locator('.work-card').click();
  await expect(page.locator('#detailImageHolder img')).toBeVisible();
});
test('unavailable thumbnail falls back to the original image', async ({ page }) => {
  await page.addInitScript(() => { window.failThumbs=true; });
  await archivedFixture(page,'normal');
  await expect(page.locator('.work-card img')).toBeVisible();
  await expect.poll(() => page.locator('.work-card img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.mockStats.downloads)).toContain('image-01-fixture.png');
});
test('invalid metadata has a distinct persistent diagnostic', async ({ page }) => {
  await archivedFixture(page,'invalid');
  await expect(page.locator('#syncNotice')).toContainText('JSON形式不一致 1件');
  await expect(page.locator('#emptyTitle')).toHaveText('作品をまだ表示できません');
});

test('draft preview follows input, removal and saved state', async ({ page }) => {
  await page.goto('/'); await fillWork(page, '<b>Rose notebook</b>');
  await expect(page.locator('#draftTitle')).toHaveText('<b>Rose notebook</b>');
  await expect(page.locator('#draftTitle b')).toHaveCount(0);
  await expect(page.locator('#draftImage img')).toHaveCount(1);
  await expect(page.locator('#draftTags .tag')).toHaveCount(2);
  await page.locator('.remove-chip').click();
  await expect(page.locator('#draftImage img')).toHaveCount(0);
  await page.locator('#fileInput').setInputFiles({ name:'image.png',mimeType:'image/png',buffer:png });
  if(await page.locator('#previewJump').isVisible()) {
    await page.locator('#previewJump').click();
    await expect(page.locator('#draftPreview')).toBeFocused();
    await page.locator('#createDock button[type="submit"]').click();
  } else await page.locator('#saveBtn').click();
  await expect(page.locator('.work-card')).toHaveCount(3);
  await expect(page.locator('#createDock')).toBeHidden();
  await page.locator('.hero [data-go="create"]').click();
  await expect(page.locator('#draftTitle')).toHaveText('まだ名前のない作品');
  await expect(page.locator('#draftImage img')).toHaveCount(0);
});

test('artwork remains uncropped and small screens fit', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.work-card')).toHaveCount(2);
  await expect(page.locator('.work-thumb img').first()).toHaveCSS('object-fit','contain');
  for(const width of [320,390,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.hero [data-go="create"]').click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('[data-view="gallery"]').filter({visible:true}).click();
  }
});

test('transient metadata failures recover without hiding saved work', async ({page}) => {
  await archivedFixture(page, 'transient');
  await expect(page.locator('.work-card')).toHaveCount(1);
  await expect(page.locator('#syncNotice')).toContainText('JSON取得失敗 0件');
  expect(await page.evaluate(() => window.mockStats.downloads.filter(n => n === 'record.json').length)).toBe(3);
});

test('successful upload missing from refreshed list is not reported as verified save',async({page})=>{
 await mockMega(page);await page.goto('/');await login(page);
 await expect(page.locator('#busyOverlay')).toBeHidden();
 await fillWork(page,'Pending visibility');await page.evaluate(()=>{window.hideSavedWork=true;});
 await page.locator('#saveBtn').click();
 await expect(page.locator('#syncNotice')).toContainText('今保存した作品を一覧で確認できませんでした');
 await expect(page.locator('#syncNotice')).toHaveClass(/warning/);
 expect(await page.evaluate(()=>window.mockStats.uploads.at(-1))).toBe('record.json');
});

test('fresh snapshots discover child-first works and reflect remote trash moves',async({page})=>{
 await page.addInitScript(()=>{window.unorderedTree=true;});
 await archivedFixture(page,'duplicate');
 await expect(page.locator('.work-card')).toHaveCount(1);
 await page.evaluate(()=>window.mockAddWork());await page.locator('#refreshBtn').click();
 await expect(page.locator('.work-card')).toHaveCount(2);
 await page.evaluate(()=>window.mockTrashWork());await page.locator('#refreshBtn').click();
 await expect(page.locator('.work-card')).toHaveCount(1);
 await page.locator('#refreshBtn').click();await expect(page.locator('.work-card')).toHaveCount(1);
 await page.evaluate(()=>{window.failTree=true;});await page.locator('#refreshBtn').click();
 await expect(page.locator('#syncNotice')).toHaveClass(/error/);
 await expect(page.locator('.work-card')).toHaveCount(1);
});
test('vendored browser SDK rebuilds moved nodes and child-first hierarchy',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {Storage}=await import('/vendor/megajs-1.3.10.mjs');
  const {reloadTree}=await import('/mega-tree.js');
  const storage=new Storage({autologin:false,keepalive:false});await storage.ready;
  let nodes=[{h:'root',t:2},{h:'trash',t:4},{h:'work',p:'root',t:1}];
  storage.api.request=(_cmd,cb)=>queueMicrotask(()=>cb(null,{ok:[],f:structuredClone(nodes)}));
  await storage.reload();
  nodes=[{h:'child',p:'parent',t:1},{h:'parent',p:'root',t:1},{h:'work',p:'trash',t:1},{h:'trash',t:4},{h:'root',t:2}];
  await reloadTree(storage);await reloadTree(storage);
  return {parent:storage.files.child.parent.nodeId,workParent:storage.files.work.parent.nodeId,listeners:storage.api.listenerCount('sc'),root:storage.root.children.map(n=>n.nodeId)};
 });
 expect(result).toEqual({parent:'parent',workParent:'trash',listeners:1,root:['parent']});
});

test('trash acknowledgment without reflected move shows an explicit warning',async({page})=>{
 await archivedFixture(page,'duplicate');await page.evaluate(()=>{window.delayTrash=true;});
 await page.locator('.work-card').click();page.once('dialog',dialog=>dialog.accept());
 await page.locator('#deleteBtn').click();
 await expect(page.locator('#syncNotice')).toContainText('ごみ箱移動の反映は未確認です');
 await expect(page.locator('.work-card')).toHaveCount(1);
});

test('missing uploaded work remains a warning on subsequent manual refresh',async({page})=>{
 await mockMega(page);await page.goto('/');await login(page);await expect(page.locator('#busyOverlay')).toBeHidden();
 await fillWork(page,'Private saved title');await page.evaluate(()=>{window.hideSavedWork=true;});await page.locator('#saveBtn').click();
 await expect(page.locator('#syncNotice')).toContainText('一覧に作品フォルダなし');
 await page.locator('#refreshBtn').click();await expect(page.locator('#busyOverlay')).toBeHidden();
 await expect(page.locator('#syncNotice')).toHaveClass(/warning/);
 await expect(page.locator('#syncNotice')).toContainText('一覧に作品フォルダなし');
 const diagnostic=JSON.parse(await page.locator('#syncDiagnostic').textContent());
 expect(diagnostic.pending).toEqual(['一覧に作品フォルダなし']);
 expect(JSON.stringify(diagnostic)).not.toContain('Private saved title');
});
test('rate limit records its code without rapid retry or exposing raw errors',async({page})=>{
 await page.addInitScript(()=>{window.metadataError='ERATELIMIT (-4): secret-account https://private.example';});
 await archivedFixture(page,'duplicate');
 await expect(page.locator('#syncNotice')).toContainText('エラー -4');
 await expect(page.locator('#syncNotice')).toContainText('通信を休止');
 expect(await page.evaluate(()=>window.mockStats.downloads.filter(n=>n==='record.json').length)).toBe(1);
 expect(await page.locator('#syncDiagnostic').textContent()).not.toContain('secret-account');
 await page.locator('#refreshBtn').click();await expect(page.locator('#busyOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.mockStats.downloads.filter(n=>n==='record.json').length)).toBe(1);
});
