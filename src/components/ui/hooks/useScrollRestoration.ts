import { useEffect, useMemo } from 'react';

type Options = {
  /** Elemento preferido (ex: main content). Pode ser null. */
  getEl: () => HTMLElement | null;
  /** Chave única por “tela lógica” (ex: admin:missions:review) */
  key: string;
  /** debounce simples para não salvar em excesso */
  saveDebounceMs?: number;
};

const NS = 'aw:scroll';

function getWindowScrollEl(): HTMLElement | null {
  return (document.scrollingElement as HTMLElement) || document.documentElement || document.body;
}

function isWindowScrollEl(el: HTMLElement) {
  const w = getWindowScrollEl();
  return !!w && (el === w || el === document.documentElement || el === document.body);
}

export function useScrollRestoration({ getEl, key, saveDebounceMs = 120 }: Options) {
  const storageKey = useMemo(() => `${NS}:${key}`, [key]);

  useEffect(() => {
    const preferred = getEl();
    const windowEl = getWindowScrollEl();

    // Decide qual “scroll root” usar:
    // - se preferred não existe, usa window
    // - se preferred existe e realmente scrolla, usa preferred
    // - se preferred existe mas não scrolla, usa window
    const el =
      preferred && preferred.scrollHeight > preferred.clientHeight + 2
        ? preferred
        : windowEl;

    if (!el) return;

    const useWindow = isWindowScrollEl(el);

    let t: ReturnType<typeof setTimeout> | null = null;
    let lastNonZeroTop = 0;

    const readStoredTop = () => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        const top = raw ? Number(raw) : 0;
        return Number.isFinite(top) ? top : 0;
      } catch {
        return 0;
      }
    };

    const writeStoredTop = (top: number) => {
      try {
        sessionStorage.setItem(storageKey, String(top));
      } catch {}
    };

    const getTop = () => {
      if (useWindow) {
        const w = getWindowScrollEl();
        return (w?.scrollTop || 0) | 0;
      }
      return (el.scrollTop || 0) | 0;
    };

    const setTop = (top: number) => {
      if (top <= 0) return;
      if (useWindow) {
        const w = getWindowScrollEl();
        if (!w) return;
        w.scrollTo({ top, behavior: 'auto' });
        return;
      }
      el.scrollTo({ top, behavior: 'auto' });
    };

    const save = () => {
      const currentTop = getTop();

      // ✅ não sobrescrever por 0
      const topToPersist =
        currentTop > 0 ? currentTop : lastNonZeroTop > 0 ? lastNonZeroTop : 0;

      if (topToPersist > 0) writeStoredTop(topToPersist);
    };

    const onScroll = () => {
      const currentTop = getTop();
      if (currentTop > 0) lastNonZeroTop = currentTop;

      if (t) clearTimeout(t);
      t = setTimeout(save, saveDebounceMs);
    };

    const restore = () => {
      const storedTop = readStoredTop();
      if (storedTop > 0) lastNonZeroTop = storedTop;

      const currentTop = getTop();

      // ✅ só restaura se o scroll real estiver no topo
      if (storedTop > 0 && currentTop === 0) {
        setTop(storedTop);
      }

      const afterTop = getTop();
      if (afterTop > 0) lastNonZeroTop = afterTop;
    };

    // mount
    restore();

    // listener de scroll correto
    if (useWindow) {
      window.addEventListener('scroll', onScroll, { passive: true });
    } else {
      el.addEventListener('scroll', onScroll, { passive: true });
    }

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        save();
        return;
      }
      if (document.visibilityState === 'visible') {
        restore();
      }
    };

    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (t) clearTimeout(t);
      document.removeEventListener('visibilitychange', onVis);
      if (useWindow) window.removeEventListener('scroll', onScroll);
      else el.removeEventListener('scroll', onScroll);
      save();
    };
  }, [getEl, storageKey, saveDebounceMs]);
}
