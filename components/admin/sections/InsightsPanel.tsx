import React from 'react';
import { BrainIcon } from '../../../constants';

export default function InsightsPanel({ insights }: { insights: any[] }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-slate-dark border border-white/5 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:border-neon-magenta/20 transition-colors">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/5">
        <div className="p-2 bg-navy-deep rounded-lg border border-purple-500/30">
            <BrainIcon className="w-5 h-5 text-neon-magenta" />
        </div>
        <h3 className="font-bold text-white text-lg font-chakra tracking-wide">AI Insights</h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {insights.map((insight, idx) => (
          <div key={idx} className={`p-4 rounded-xl border text-sm flex items-start transition-all hover:translate-x-1 ${
              insight.type === 'fraud_risk' ? 'bg-red-900/10 border-red-500/30 text-red-200' :
              insight.type === 'high_activity' ? 'bg-green-900/10 border-green-500/30 text-green-200' :
              'bg-navy-deep border-white/10 text-gray-300 hover:border-white/20'
          }`}>
            <span className="mr-3 text-xl filter drop-shadow-md">
                {insight.type === 'fraud_risk' ? '🚨' : insight.type === 'high_activity' ? '📈' : '💡'}
            </span>
            <div>
                <strong className="block uppercase text-[10px] tracking-widest opacity-70 mb-1 font-bold">{insight.type.replace('_', ' ')}</strong>
                {insight.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}