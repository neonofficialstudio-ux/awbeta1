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

    // ✅ guarda o último scroll “válido” (não-zero)
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

    const save = () => {
      const currentTop = el.scrollTop || 0;

      // ✅ nunca “mata” um valor bom salvando 0
      const topToPersist =
        currentTop > 0 ? currentTop : lastNonZeroTop > 0 ? lastNonZeroTop : 0;

      if (topToPersist > 0) {
        writeStoredTop(topToPersist);
      }
    };

    const onScroll = () => {
      const currentTop = el.scrollTop || 0;
      if (currentTop > 0) lastNonZeroTop = currentTop;

      if (t) clearTimeout(t);
      t = setTimeout(save, saveDebounceMs);
    };

    const restore = (reason: 'mount' | 'visible') => {
      const storedTop = readStoredTop();

      // mantém memória coerente
      if (storedTop > 0) lastNonZeroTop = storedTop;

      const currentTop = el.scrollTop || 0;

      // ✅ restore só se o container estiver no topo (reset involuntário)
      // e existir posição válida salva
      if (storedTop > 0 && currentTop === 0) {
        el.scrollTo({ top: storedTop, behavior: 'auto' });
      }

      // se o usuário já está em algum lugar, atualiza lastNonZeroTop
      const afterTop = el.scrollTop || 0;
      if (afterTop > 0) lastNonZeroTop = afterTop;

      // (reason só para debug futuro; não loga em produção)
      void reason;
    };

    // ✅ restore no mount / troca de key
    restore('mount');

    el.addEventListener('scroll', onScroll, { passive: true });

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        // ✅ salva ao sair sem sobrescrever por 0
        save();
        return;
      }
      if (document.visibilityState === 'visible') {
        // ✅ repara reset involuntário quando volta
        restore('visible');
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
