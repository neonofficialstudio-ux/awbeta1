
import React from 'react';
import { SettingsIcon } from '../../../constants';

export default function TelemetryPanel({ telemetry }: { telemetry: any }) {
  if (!telemetry) return null;

  return (
    <div className="bg-[#181818] border border-gray-700 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="w-5 h-5 text-blue-400" />
        <h3 className="font-bold text-white text-lg">Telemetria V4.2</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold">Eventos</p>
              <p className="text-2xl font-mono text-white">{telemetry.totals.events}</p>
          </div>
          <div className="text-center p-4 bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold">Métricas</p>
              <p className="text-2xl font-mono text-blue-400">{telemetry.totals.metrics}</p>
          </div>
          <div className="text-center p-4 bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold">Anomalias</p>
              <p className={`text-2xl font-mono font-bold ${telemetry.totals.anomalies > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {telemetry.totals.anomalies}
              </p>
          </div>
      </div>

      <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Top Eventos</h4>
          <div className="space-y-2">
              {Object.entries(telemetry.topEvents).slice(0, 5).map(([event, count]: any, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-800 pb-1 last:border-0">
                      <span className="text-gray-300 font-mono">{event}</span>
                      <span className="text-gray-500">{count}</span>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}
