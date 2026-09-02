import { chromium } from 'playwright';

const extensionPath = new URL('../dist/', import.meta.url).pathname.replace(/^\//, '').replaceAll('/', '\\');
const userDataDir = `C:\\Users\\Suvern\\AppData\\Local\\Temp\\opencode\\leetlens-stream-smoke-${Date.now()}`;
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  viewport: { width: 1440, height: 900 },
});

try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  await context.route('https://api.deepseek.com/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"choices":[{"delta":{"content":"这是"}}]}\n\ndata: {"choices":[{"delta":{"content":"测试回复。"}}]}\n\ndata: [DONE]\n\n',
    });
  });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await popup.locator('input').first().fill('sk-test-placeholder');
  await popup.getByRole('button', { name: '保存设置' }).click();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('https://leetcode.cn/problems/two-sum/description/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-testid="leetlens-panel"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('textarea').last().fill('给我一个提示');
  await page.getByRole('button', { name: '发送' }).click();
  await page.locator('.answer').filter({ hasText: '这是测试回复。' }).last().waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.stop').waitFor({ state: 'hidden', timeout: 15000 });
  console.log(JSON.stringify({ streamed: true, generationStopped: true, pageErrors }));
} finally {
  await context.close();
}
