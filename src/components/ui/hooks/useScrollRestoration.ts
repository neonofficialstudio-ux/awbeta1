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

    // ✅ memória local (não depende de storage)
    let lastKnownTop = 0;

    const save = () => {
      try {
        const top = el.scrollTop || 0;
        lastKnownTop = top;
        sessionStorage.setItem(storageKey, String(top));
      } catch {}
    };

    const onScroll = () => {
      lastKnownTop = el.scrollTop || 0;
      if (t) clearTimeout(t);
      t = setTimeout(save, saveDebounceMs);
    };

    const restoreFromStorage = () => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        const top = raw ? Number(raw) : 0;

        if (Number.isFinite(top) && top > 0) {
          el.scrollTo({ top, behavior: 'auto' });
          lastKnownTop = top;
        } else {
          // se não tem nada salvo, mantém lastKnownTop conforme estado atual
          lastKnownTop = el.scrollTop || 0;
        }
      } catch {}
    };

    // ✅ restore só no mount / troca de key
    restoreFromStorage();

    el.addEventListener('scroll', onScroll, { passive: true });

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        // salva ao sair
        save();
        return;
      }

      // ✅ ao voltar: só “corrige” se detectarmos reset involuntário pro topo
      // (não teleporta se o usuário realmente estava no topo)
      if (document.visibilityState === 'visible') {
        const currentTop = el.scrollTop || 0;
        if (currentTop === 0 && lastKnownTop > 0) {
          el.scrollTo({ top: lastKnownTop, behavior: 'auto' });
        }
      }
    };

    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (t) clearTimeout(t);
      el.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      save();
    };
  }, [getEl, storageKey, saveDebounceMs]);
}
