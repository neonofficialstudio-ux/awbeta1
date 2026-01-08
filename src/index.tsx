import './index.css'; // Ajuste de importação para CSS local
import './core/polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { config } from './core/config';

// ✅ Supabase hardening: nunca carregar estado legado (mock/local engines) em produção.
// Resolve "F5 infinito" sem precisar limpar cookies manualmente.
if (config.backendProvider === 'supabase') {
  const STORAGE_VERSION = 'aw_storage_v1_2026-01-08'; // mude quando quiser forçar reset global
  const versionKey = 'aw_storage_version';

  const safeGet = (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const safeSet = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };

  const purgeAwKeys = () => {
    try {
      // remove tudo que for do AW (aw_*)
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;

        // tudo que começa com "aw_" é legado/persistência local do app
        if (key.startsWith('aw_')) {
          localStorage.removeItem(key);
        }
      }

      // limpa sessionStorage também (muitos loops ficam presos aqui)
      sessionStorage.clear();
    } catch {}
  };

  const current = safeGet(versionKey);
  if (current !== STORAGE_VERSION) {
    purgeAwKeys();
    safeSet(versionKey, STORAGE_VERSION);
  } else {
    // Mesmo na mesma versão, garantimos que estados legados críticos nunca existam
    // (evita voltar bug se algum módulo insistir em gravar).
    const legacyCritical = [
      'aw_session_v4',
      'aw_mock_db_v5_0',
      'aw_mock_db_checksum',
      'aw_ranking_db_v5',
      'aw_ranking_session_v5',
      'aw_event_session_v5',
      'aw_missions_db_v4_2',
      'aw_queue_items_v5',
      'aw_queue_spotlight_v5',
      'aw_economy_ledger_v5',
      'aw_economy_ledger_v6_5',
    ];
    for (const k of legacyCritical) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
