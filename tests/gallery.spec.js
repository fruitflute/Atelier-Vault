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
