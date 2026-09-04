export const host = document.createElement('div');
host.id = 'leetcopilot-root';

export function mountHost() {
  const layout = document.querySelector<HTMLElement>('#qd-content');
  if (layout && host.parentElement !== layout) layout.append(host);
}

export function syncLayout() {
  const layout = host.parentElement as HTMLElement | null;
  const workbench = layout?.querySelector<HTMLElement>(':scope > .flexlayout__layout');
  if (!layout || !workbench) return;
  const sidebarWidth = host.offsetWidth || 408;
  layout.style.position = 'relative';
  workbench.style.position = 'absolute';
  workbench.style.top = '0';
  workbench.style.left = '0';
  workbench.style.bottom = '0';
  workbench.style.right = `${sidebarWidth}px`;
  workbench.style.width = 'auto';
  host.style.position = 'absolute';
  host.style.top = '0';
  host.style.right = '0';
  host.style.bottom = '0';
  host.style.height = '100%';
}

mountHost();
if (!host.parentElement) document.documentElement.append(host);
syncLayout();
