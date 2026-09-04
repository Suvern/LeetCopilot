import type { BackgroundEvent } from '../shared/messages';

export async function sendToTab(event: BackgroundEvent, tabId: number | undefined) {
  if (tabId === undefined) return;
  try {
    await chrome.tabs.sendMessage(tabId, event);
  } catch {
    // The page may have navigated or the content script may not be mounted yet.
  }
}
