import { useEffect, useMemo } from 'react';

type Options = {
  /** Elemento que realmente scrolla (ex: main content div). Se null, não faz nada. */
  getEl: () => HTMLElement | null;
  /** Chave única por “tela lógica” (ex: admin:missions:review) */
  key: string;
  /** debounce simples para não salvar em excesso */
  saveDebounceMs?: number;
};

const NS = 'aw:scroll';

export function useScrollRestoration({ getEl, key, saveDebounceMs = 120 }: Options) {
  const storageKey = useMemo(() => `${NS}:${key}`, [key]);

  useEffect(() => {
    const el = getEl();
    if (!el) return;

    let t: ReturnType<typeof setTimeout> | null = null;

    const save = () => {
      try {
        const top = el.scrollTop || 0;
        sessionStorage.setItem(storageKey, String(top));
      } catch {}
    };

    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(save, saveDebounceMs);
    };

    const restore = () => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        const top = raw ? Number(raw) : 0;
        if (Number.isFinite(top) && top > 0) {
          el.scrollTo({ top, behavior: 'auto' });
        }
      } catch {}
    };

    restore();

    el.addEventListener('scroll', onScroll, { passive: true });

    const onVis = () => {
      if (document.visibilityState === 'visible') restore();
    };
    const onFocus = () => restore();

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);

    return () => {
      if (t) clearTimeout(t);
      el.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      save();
    };
  }, [getEl, storageKey, saveDebounceMs]);
}
