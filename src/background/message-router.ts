import type { BackgroundRequest, OperationFailure, VersionCheckResponse } from '../shared/messages'
import { cancelChat, streamChat } from './chat-service'
import { applyCode, readEditorCode } from './editor-gateway'
import { testProviderKey } from './provider-client'

const RELEASES_API_URL = 'https://api.github.com/repos/Suvern/LeetCopilot/releases/latest'
const RELEASES_PAGE_URL = 'https://github.com/Suvern/LeetCopilot/releases'
const PACKAGE_API_URL = 'https://raw.githubusercontent.com/Suvern/LeetCopilot/main/package.json'
const CHROME_WEB_STORE_URL_PATTERN = /^https:\/\/chromewebstore\.google\.com\/detail\//

function trustedReleaseUrl(value: string | undefined) {
  if (!value) return RELEASES_PAGE_URL
  try {
    const url = new URL(value)
    const isGitHubRelease = url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.startsWith('/Suvern/LeetCopilot/releases')
    const isChromeWebStore = url.protocol === 'https:' && url.hostname === 'chromewebstore.google.com' && url.pathname.startsWith('/detail/')
    return isGitHubRelease || isChromeWebStore
      ? url.toString()
      : RELEASES_PAGE_URL
  } catch {
    return RELEASES_PAGE_URL
  }
}

function versionParts(value: string) {
  return value.replace(/^v/i, '').split(/[.+-]/, 3).map((part) => Number.parseInt(part, 10) || 0)
}

function isNewerVersion(latest: string, current: string) {
  const latestParts = versionParts(latest)
  const currentParts = versionParts(current)
  for (let index = 0; index < 3; index += 1) {
    if (latestParts[index] !== currentParts[index]) return latestParts[index] > currentParts[index]
  }
  return false
}

function isNormalInstall() {
  return chrome.management.getSelf().then((extension) => extension.installType === 'normal').catch(() => false)
}

async function getChromeWebStoreUrl() {
  try {
    const response = await fetch(PACKAGE_API_URL, { headers: { Accept: 'application/json' } })
    if (!response.ok) return undefined
    const packageJson = await response.json() as { chromeWebStoreUrl?: unknown }
    return typeof packageJson.chromeWebStoreUrl === 'string' && CHROME_WEB_STORE_URL_PATTERN.test(packageJson.chromeWebStoreUrl)
      ? packageJson.chromeWebStoreUrl
      : undefined
  } catch {
    return undefined
  }
}

async function checkVersion(): Promise<VersionCheckResponse> {
  const currentVersion = chrome.runtime.getManifest().version

  // 测试口子 1：取消下一行注释，模拟 GitHub 更新提示。
  // const testResponse: VersionCheckResponse | undefined = { ok: true, updateAvailable: true, currentVersion, latestVersion: '9.9.9', releaseUrl: RELEASES_PAGE_URL, updateUrl: RELEASES_PAGE_URL }
  // 测试口子 2：取消下一行注释，模拟 Chrome 商店更新提示（请替换为真实商店链接）。
  // const testResponse: VersionCheckResponse | undefined = { ok: true, updateAvailable: true, currentVersion, latestVersion: '9.9.9', releaseUrl: RELEASES_PAGE_URL, updateUrl: 'https://chromewebstore.google.com/detail/your-extension-id', useChromeWebStore: true }
  const testResponse: VersionCheckResponse | undefined = undefined
  if (testResponse) return testResponse

  try {
    const response = await fetch(RELEASES_API_URL, { headers: { Accept: 'application/vnd.github+json' } })
    if (!response.ok) return { ok: true, updateAvailable: false, currentVersion }
    const release = await response.json() as { tag_name?: unknown; html_url?: unknown; draft?: unknown; prerelease?: unknown }
    if (typeof release.tag_name !== 'string' || release.draft === true || release.prerelease === true) return { ok: true, updateAvailable: false, currentVersion }
    const latestVersion = release.tag_name
    const releaseUrl = typeof release.html_url === 'string' ? release.html_url : RELEASES_PAGE_URL
    const updateAvailable = isNewerVersion(latestVersion, currentVersion)
    if (!updateAvailable || await isNormalInstall()) return { ok: true, updateAvailable, currentVersion, latestVersion, releaseUrl }
    const chromeWebStoreUrl = await getChromeWebStoreUrl()
    return { ok: true, updateAvailable, currentVersion, latestVersion, releaseUrl, updateUrl: chromeWebStoreUrl ?? releaseUrl, useChromeWebStore: Boolean(chromeWebStoreUrl) }
  } catch {
    return { ok: true, updateAvailable: false, currentVersion }
  }
}

export function registerMessageRouter() {
  chrome.runtime.onMessage.addListener((request: BackgroundRequest, sender, sendResponse) => {
    void handleMessage(request, sender.tab?.id, sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : '请求失败。' })
    })
    return true
  })
}

async function handleMessage(request: BackgroundRequest, tabId: number | undefined, sendResponse: (response?: unknown) => void) {
  switch (request.type) {
    case 'cancel':
      cancelChat(request.requestId)
      sendResponse({ ok: true })
      return
    case 'check-version':
      sendResponse(await checkVersion())
      return
    case 'open-release':
      await chrome.tabs.create({ url: trustedReleaseUrl(request.url) })
      sendResponse({ ok: true })
      return
    case 'read-editor':
      sendResponse(await respond(() => readEditorCode(tabId), '无法读取代码编辑器。'))
      return
    case 'apply-code':
      sendResponse(await respond(() => applyCode(request.code, request.startLine, request.endLine, tabId), '无法更新代码编辑器。'))
      return
    case 'test-key':
      sendResponse(await respond(() => testProviderKey(request.account), 'API Key 测试失败。'))
      return
    case 'chat':
      await streamChat(request, tabId)
      sendResponse({ ok: true })
      return
  }
}

async function respond<T>(operation: () => Promise<T>, fallback: string): Promise<T | OperationFailure> {
  try {
    return await operation()
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : fallback }
  }
}
