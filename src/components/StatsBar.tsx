import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react';
import { ApiMonitor } from '../types';

interface StatsBarProps {
  monitors: ApiMonitor[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ monitors }) => {
  const total = monitors.length;
  const healthy = monitors.filter((m) => m.active && m.status === 'healthy').length;
  const unhealthy = monitors.filter((m) => m.active && m.status === 'unhealthy').length;
  const paused = monitors.filter((m) => !m.active || m.status === 'paused').length;

  const totalChecks = monitors.reduce((acc, m) => acc + (m.totalChecks || 0), 0);
  const avgUptime = total > 0
    ? Math.round(monitors.reduce((acc, m) => acc + (m.uptimePercent || 100), 0) / total)
    : 100;

  const latencies = monitors
    .filter((m) => m.lastLatencyMs && m.status === 'healthy')
    .map((m) => m.lastLatencyMs as number);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Operacionais */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-1">APIs Operacionais</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400">{healthy}</span>
            <span className="text-xs text-slate-400">/ {total} ativas</span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>
      </div>

      {/* Falhas / Alertas */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-1">Em Alerta / Falha</span>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold ${unhealthy > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {unhealthy}
            </span>
            {paused > 0 && (
              <span className="text-xs text-slate-400">({paused} pausadas)</span>
            )}
          </div>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
          unhealthy > 0
            ? 'bg-rose-500/10 border border-rose-500/20'
            : 'bg-slate-800/60 border border-slate-700/40'
        }`}>
          <AlertTriangle className={`h-5 w-5 ${unhealthy > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
        </div>
      </div>

      {/* Uptime Médio */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-1">Uptime Médio</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{avgUptime}%</span>
            <span className="text-xs text-emerald-400 font-medium">Global</span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
      </div>

      {/* Latência Média & Total Checagens */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-1">Tempo de Resposta</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-300">
              {avgLatency > 0 ? `${avgLatency}ms` : '--'}
            </span>
            <span className="text-xs text-slate-400">
              {totalChecks} pings
            </span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Zap className="h-5 w-5 text-amber-400" />
        </div>
      </div>
    </div>
  );
};
