import './index.css'; // Ajuste de importação para CSS local
import './core/polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { config } from './core/config';

// ✅ Em Supabase, nunca reaproveitar sessão/db do mock (isso quebra refresh/F5)
if (config.backendProvider === 'supabase') {
  const keysToPurge = [
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

  for (const k of keysToPurge) {
    try {
      localStorage.removeItem(k);
    } catch {}
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
