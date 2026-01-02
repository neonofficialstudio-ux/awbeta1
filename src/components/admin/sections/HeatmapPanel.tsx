
import React from 'react';

export default function HeatmapPanel({ heatmap }: { heatmap: Record<string, number> }) {
  if (!heatmap) return null;
  
  const maxVal = Math.max(...Object.values(heatmap), 1);

  const getColor = (val: number) => {
      const intensity = val / maxVal;
      if (intensity === 0) return 'bg-gray-800';
      if (intensity < 0.3) return 'bg-blue-900/40';
      if (intensity < 0.6) return 'bg-blue-600/60';
      if (intensity < 0.8) return 'bg-purple-500/80';
      return 'bg-goldenYellow-500';
  };

  return (
    <div className="bg-[#181818] border border-gray-700 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white text-lg">Heatmap de Atividade (24h)</h3>
          <div className="text-xs text-gray-500 flex gap-2 items-center">
              <span className="w-3 h-3 bg-gray-800 rounded-sm"></span> 0
              <span className="w-3 h-3 bg-goldenYellow-500 rounded-sm ml-2"></span> Max
          </div>
      </div>
      
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
        {Object.entries(heatmap).map(([hour, count]) => (
          <div 
            key={hour} 
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all hover:scale-105 cursor-default ${getColor(count)}`}
            title={`${count} eventos`}
          >
            <span className="text-[10px] font-bold text-white/70">{hour}h</span>  
            <span className="text-xs font-bold text-white">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
