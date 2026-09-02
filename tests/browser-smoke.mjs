import { chromium } from 'playwright';

const extensionPath = new URL('../dist/', import.meta.url).pathname.replace(/^\//, '').replaceAll('/', '\\');
const userDataDir = 'C:\\Users\\Suvern\\AppData\\Local\\Temp\\opencode\\leetlens-browser-smoke-script';
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  viewport: { width: 1440, height: 900 },
});

try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('https://leetcode.cn/problems/two-sum/description/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-testid="leetlens-panel"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2500);
  const panelText = await page.locator('[data-testid="leetlens-panel"]').innerText();
  const code = await page.evaluate(() => [...document.querySelectorAll('textarea.inputarea')].map((element) => element.value).find((value) => value.trim()) ?? '');
  await page.getByRole('button', { name: '收起面板' }).click();
  const collapsed = await page.getByRole('button', { name: '打开 LeetLens' }).isVisible();
  await page.getByRole('button', { name: '打开 LeetLens' }).click();
  await page.locator('textarea').last().fill('提示');
  await page.getByRole('button', { name: '发送' }).click();
  await page.locator('.error').waitFor({ state: 'visible', timeout: 5000 });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await popup.locator('input').first().fill('sk-test-placeholder');
  await popup.getByRole('button', { name: '保存设置' }).click();
  console.log(JSON.stringify({ injected: true, languageCpp: panelText.includes('C++'), codeRead: code.includes('twoSum'), collapsed, missingKey: (await page.locator('.error').innerText()).includes('API Key'), popupSaved: (await popup.locator('body').innerText()).includes('设置已保存'), pageErrors }));
} finally {
  await context.close();
}
