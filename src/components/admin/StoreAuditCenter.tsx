import React, { useEffect, useState } from 'react';
import Card from '../ui/base/Card';
import Button from '../ui/base/Button';
import TableResponsiveWrapper from '../ui/patterns/TableResponsiveWrapper';
import { adminListAuditLog } from '../../api/admin/auditEngine';
import { adminListTelemetry } from '../../api/admin/telemetryEngineV5';

export default function StoreAuditCenter() {
  const [mode, setMode] = useState<'audit' | 'telemetry'>('audit');
  const [onlyStore, setOnlyStore] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (reset: boolean) => {
    setLoading(true);
    setErr(null);
    try {
      const nextOffset = reset ? 0 : offset;
      const data =
        mode === 'audit'
          ? await adminListAuditLog(50, nextOffset)
          : await adminListTelemetry(50, nextOffset);

      setItems(prev => (reset ? data : [...prev, ...data]));
      setOffset(nextOffset + 50);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || 'Falha ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const pill = (active: boolean) =>
    `px-3 py-2 rounded-full text-xs font-bold border transition-all ${
      active
        ? 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan'
        : 'bg-[#101216] border-[#2A2D33] text-white/70 hover:border-white/20'
    }`;

  const isStoreRelated = (row: any) => {
    const a = String(row?.action || '').toLowerCase();
    const e = String(row?.event || '').toLowerCase();
    const t = String(row?.target || '').toLowerCase();
    const hay = `${a} ${e} ${t}`;

    return (
      hay.includes('store') ||
      hay.includes('redeem') ||
      hay.includes('inventory') ||
      hay.includes('production') ||
      hay.includes('usable') ||
      hay.includes('visual_reward')
    );
  };

  const visible = onlyStore ? items.filter(isStoreRelated) : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={pill(mode === 'audit')} onClick={() => setMode('audit')}>
          Audit Log
        </button>
        <button type="button" className={pill(mode === 'telemetry')} onClick={() => setMode('telemetry')}>
          Telemetria
        </button>
        <button
          type="button"
          className={pill(onlyStore)}
          onClick={() => setOnlyStore(v => !v)}
        >
          {onlyStore ? 'Somente Loja: ON' : 'Somente Loja: OFF'}
        </button>

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => load(true)}>
            Atualizar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => load(false)} disabled={loading}>
            {loading ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      </div>

      <Card className="bg-slate-dark border-white/5">
        <Card.Header className="border-white/5">
          <h3 className="text-lg font-bold text-white">
            {mode === 'audit' ? 'Auditoria (Admin)' : 'Telemetria (Sistema)'}
          </h3>
        </Card.Header>

        <Card.Body noPadding>
          {err && <div className="p-4 text-sm text-red-300">{err}</div>}

          <TableResponsiveWrapper>
            <table className="w-full text-sm text-left text-[#B3B3B3]">
              <thead className="text-xs text-[#808080] uppercase bg-[#14171C] border-b border-[#2A2D33]">
                {mode === 'audit' ? (
                  <tr>
                    <th className="px-4 py-3">Quando</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Meta</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3">Quando</th>
                    <th className="px-4 py-3">Evento</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Meta</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {visible.map((row: any) => (
                  <tr key={row.id} className="border-b border-[#20242B] hover:bg-[#101216]">
                    <td className="px-4 py-3">{row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '-'}</td>
                    {mode === 'audit' ? (
                      <>
                        <td className="px-4 py-3">{row.action}</td>
                        <td className="px-4 py-3">{row.target ?? '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">{row.event}</td>
                        <td className="px-4 py-3">{row.source}</td>
                      </>
                    )}
                    <td className="px-4 py-3 font-mono text-xs text-white/60">
                      {row.meta ? JSON.stringify(row.meta).slice(0, 160) : '-'}
                    </td>
                  </tr>
                ))}

                {visible.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-600 italic">
                      Sem dados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableResponsiveWrapper>
        </Card.Body>
      </Card>
    </div>
  );
}
