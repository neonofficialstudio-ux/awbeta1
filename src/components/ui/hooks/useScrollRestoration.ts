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

/**
 * Restauro de scroll robusto para containers com conteúdo assíncrono.
 *
 * Problema que resolve:
 * - Em remount, muitas telas mostram um spinner (conteúdo baixo).
 * - O restore rodava cedo demais e era "clampado" para 0.
 * - Depois que o conteúdo real carregava, não havia novo restore.
 *
 * Solução:
 * - Tenta restore em rAF algumas vezes.
 * - Usa ResizeObserver para restaurar quando o scrollHeight aumentar.
 * - Não sobrescreve posição salva com 0 (mantém lastNonZeroTop).
 */
export function useScrollRestoration({ getEl, key, saveDebounceMs = 120 }: Options) {
  const storageKey = useMemo(() => `${NS}:${key}`, [key]);

  useEffect(() => {
    const el = getEl();
    if (!el) return;

    let t: ReturnType<typeof setTimeout> | null = null;
    let raf: number | null = null;

    // Mantém o último top > 0 para não "matar" o scroll salvo quando a tela volta pro topo temporariamente.
    let lastNonZeroTop = 0;

    const readStoredTop = (): number => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        const top = raw ? Number(raw) : 0;
        return Number.isFinite(top) ? top : 0;
      } catch {
        return 0;
      }
    };

    const save = () => {
      try {
        const top = el.scrollTop || 0;
        if (top > 0) lastNonZeroTop = top;
        // Evita gravar 0 se já tivemos uma posição válida.
        const valueToSave = top > 0 ? top : lastNonZeroTop;
        sessionStorage.setItem(storageKey, String(valueToSave || 0));
      } catch {}
    };

    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(save, saveDebounceMs);
    };

    const clampTop = (wantedTop: number) => {
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
      return Math.max(0, Math.min(wantedTop, maxTop));
    };

    // Restore com tentativas para casos em que o conteúdo ainda não foi montado (spinner/async).
    const restore = (attempt = 0) => {
      const storedTop = readStoredTop();
      if (!storedTop || storedTop <= 0) return;

      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);

      // Ainda não tem conteúdo suficiente para rolar até o ponto salvo.
      // Aguarda alguns frames para o conteúdo montar.
      if (maxTop <= 0 || maxTop < Math.min(storedTop, 20)) {
        if (attempt < 16) {
          raf = window.requestAnimationFrame(() => restore(attempt + 1));
        }
        return;
      }

      const target = clampTop(storedTop);

      // Só aplica se estivermos no topo (ou muito longe do alvo)
      // para não "brigar" com o usuário.
      const diff = Math.abs((el.scrollTop || 0) - target);
      if ((el.scrollTop || 0) === 0 || diff > 8) {
        el.scrollTo({ top: target, behavior: 'auto' });
      }
    };

    // 1) Restore inicial (agora + próximo tick)
    restore();
    setTimeout(() => restore(0), 0);

    // 2) Salvar ao rolar
    el.addEventListener('scroll', onScroll, { passive: true });

    // 3) Ao voltar para a aba: tentar restore (mas sem agressividade)
    const onVis = () => {
      if (document.visibilityState === 'visible') restore(0);
    };
    const onFocus = () => restore(0);

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);

    // 4) Quando o conteúdo do container muda (async data), restaurar novamente.
    // Isso resolve o caso clássico: mount com spinner (altura pequena) -> clamp 0 -> conteúdo cresce.
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => {
        // Só tenta restaurar quando existe chance de scroll > 0.
        restore(0);
      });
      ro.observe(el);
    } catch {
      // ResizeObserver pode não existir em alguns ambientes; ok.
    }

    return () => {
      if (t) clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      if (ro) ro.disconnect();
      save();
    };
  }, [getEl, storageKey, saveDebounceMs]);
}
