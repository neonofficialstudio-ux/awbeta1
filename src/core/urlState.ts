type AdminTab = 'dashboard' | 'store' | 'missions' | 'users' | 'queues' | 'settings' | string;

export type UrlState = {
  view?: string;
  adminTab?: AdminTab;
  adminSubTab?: string;
};

const getUrl = () => new URL(window.location.href);

export function readUrlState(): UrlState {
  const url = getUrl();
  const p = url.searchParams;

  const view = p.get('view') || undefined;
  const adminTab = (p.get('adminTab') || undefined) as AdminTab | undefined;
  const adminSubTab = p.get('adminSubTab') || undefined;

  return { view, adminTab, adminSubTab };
}

export function writeUrlState(next: UrlState, opts?: { replace?: boolean }) {
  const url = getUrl();
  const p = url.searchParams;

  const setOrDelete = (key: string, val?: string) => {
    if (val && String(val).trim().length) p.set(key, String(val));
    else p.delete(key);
  };

  setOrDelete('view', next.view);
  setOrDelete('adminTab', next.adminTab);
  setOrDelete('adminSubTab', next.adminSubTab);

  const serializedParams = p.toString();
  const newUrl = `${url.pathname}${serializedParams ? `?${serializedParams}` : ''}${url.hash || ''}`;

  const replace = opts?.replace !== false;
  if (replace) window.history.replaceState({}, '', newUrl);
  else window.history.pushState({}, '', newUrl);
}

export function getStableUrlKey(): string {
  const url = getUrl();
  const p = url.searchParams;
  const view = p.get('view') || '';
  const adminTab = p.get('adminTab') || '';
  const adminSubTab = p.get('adminSubTab') || '';
  return `view=${view}|adminTab=${adminTab}|adminSubTab=${adminSubTab}`;
}
