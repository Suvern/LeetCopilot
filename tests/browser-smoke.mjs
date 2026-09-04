import { chromium } from 'playwright';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(new URL('../dist/', import.meta.url));
const userDataDir = join(tmpdir(), `leetcopilot-browser-smoke-${Date.now()}`);
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  viewport: { width: 1440, height: 900 },
});

try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  await context.route('https://api.deepseek.com/chat/completions', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: 'OK' } }] }) });
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('https://leetcode.cn/problems/two-sum/description/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-testid="leetcopilot-panel"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2500);
  const panelText = await page.locator('[data-testid="leetcopilot-panel"]').innerText();
  const code = await page.evaluate(() => [...document.querySelectorAll('textarea.inputarea')].map((element) => element.value).find((value) => value.trim()) ?? '');
  const setupPromptVisible = await page.getByRole('dialog', { name: '先连接 AI 平台' }).isVisible();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await popup.locator('input').first().fill('sk-test-placeholder');
  await popup.getByRole('button', { name: '测试并保存' }).click();
  await popup.getByText('API Key 测试成功，已保存').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.setup-overlay').waitFor({ state: 'hidden', timeout: 5000 });
  await page.getByRole('button', { name: '收起面板' }).click();
  const collapsed = await page.getByRole('button', { name: '打开 LeetCopilot' }).isVisible();
  await page.getByRole('button', { name: '打开 LeetCopilot' }).click();
  await page.locator('.composer textarea').fill('提示');
  await page.getByRole('button', { name: '发送 (Enter)' }).click();
  await page.locator('.answer').last().waitFor({ state: 'visible', timeout: 5000 });
  console.log(JSON.stringify({ injected: true, languageCpp: panelText.includes('C++'), codeRead: code.includes('twoSum'), setupPromptVisible, collapsed, popupSaved: (await popup.locator('body').innerText()).includes('API Key 测试成功，已保存'), pageErrors }));
} finally {
  await context.close();
  await rm(userDataDir, { recursive: true, force: true });
}
