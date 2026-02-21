import { useEffect, useMemo, useRef } from 'react';

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

  // mantém em memória pra não depender 100% do timer gravar no storage
  const lastNonZeroTopRef = useRef(0);
  const lastSavedTopRef = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = getEl();
    if (!el) return;

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

    const saveNow = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const currentTop = el.scrollTop || 0;

      // atualiza o “último scroll válido”
      if (currentTop > 0) lastNonZeroTopRef.current = currentTop;

      // nunca salva 0 se já tivemos um scroll > 0 nessa tela
      const toSave = currentTop > 0 ? currentTop : lastNonZeroTopRef.current;

      if (toSave > 0 && lastSavedTopRef.current !== toSave) {
        lastSavedTopRef.current = toSave;
        writeStoredTop(toSave);
      }
    };

    const scheduleSave = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveNow();
      }, saveDebounceMs);
    };

    const restore = () => {
      const storedTop = readStoredTop();
      if (!(storedTop > 0)) return;

      // ✅ enterprise: só restaura se estamos no topo (evita “teleporte” agressivo)
      if ((el.scrollTop || 0) <= 1) {
        el.scrollTo({ top: storedTop, behavior: 'auto' });
      }
    };

    const onScroll = () => {
      // mantém memória atualizada imediatamente (mesmo se timer for throttled)
      const top = el.scrollTop || 0;
      if (top > 0) lastNonZeroTopRef.current = top;

      scheduleSave();
    };

    const onVisibilityChange = () => {
      // ✅ CRÍTICO: quando vai pra background, flush do save (não depende do debounce)
      if (document.visibilityState === 'hidden') {
        saveNow();
        return;
      }

      // quando volta, restaura após o layout estabilizar
      requestAnimationFrame(() => requestAnimationFrame(() => restore()));
    };

    const onBlur = () => {
      // troca de aba/janela: flush imediato
      saveNow();
    };

    const onPageHide = () => {
      // bfcache / page lifecycle: flush imediato
      saveNow();
    };

    // restaura no mount (depois de 2 frames pra evitar competir com render)
    requestAnimationFrame(() => requestAnimationFrame(() => restore()));

    el.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      el.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      saveNow();
    };
  }, [getEl, storageKey, saveDebounceMs]);
}
