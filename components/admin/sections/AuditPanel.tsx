
import React, { useState, useEffect } from 'react';
import { auditSnapshot } from '../../../api/system/audit';
import { ShieldIcon } from '../../../constants';

export default function AuditPanel() {
  const [audit, setAudit] = useState<any>(null);

  useEffect(() => {
    const result = auditSnapshot();
    setAudit(result.data);
  }, []);

  if (!audit) return null;

  return (
    <div className="bg-[#121212] border-2 border-gray-800 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShieldIcon className="w-24 h-24 text-gray-500" />
      </div>
      
      <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
          <ShieldIcon className="w-5 h-5 text-gray-400" /> Auditoria Interna
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Base de Usuários</p>
              <p className="text-xl font-mono text-white">{audit.users_count}</p>
          </div>
          <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Missões Totais</p>
              <p className="text-xl font-mono text-white">{audit.missions_count}</p>
          </div>
          <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Fila Profunda</p>
              <p className="text-xl font-mono text-white">{audit.queue_depth}</p>
          </div>
          <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Ledger Economia</p>
              <p className="text-xl font-mono text-white">{audit.economy_ledger_size}</p>
          </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-800 text-[10px] text-gray-600 font-mono flex justify-between">
          <span>SNAPSHOT ID: {Date.now().toString(36).toUpperCase()}</span>
          <span>VERIFIED: {new Date(audit.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
