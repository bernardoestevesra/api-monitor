import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Clock, 
  Zap, 
  ExternalLink, 
  Copy, 
  Check, 
  Bell, 
  BellOff, 
  Edit3, 
  Trash2, 
  AlertCircle,
  BarChart2
} from 'lucide-react';
import { ApiMonitor, CheckHistoryEntry } from '../types';

interface MonitorCardProps {
  monitor: ApiMonitor;
  history?: CheckHistoryEntry[];
  onTriggerCheck: (id: string) => Promise<void>;
  onToggleActive: (id: string) => Promise<void>;
  onEdit: (monitor: ApiMonitor) => void;
  onDelete: (id: string) => void;
  onOpenHistory: (monitor: ApiMonitor) => void;
}

export const MonitorCard: React.FC<MonitorCardProps> = ({
  monitor,
  history = [],
  onTriggerCheck,
  onToggleActive,
  onEdit,
  onDelete,
  onOpenHistory,
}) => {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(monitor.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    try {
      await onTriggerCheck(monitor.id);
    } finally {
      setIsChecking(false);
    }
  };

  // Format interval string
  const formatInterval = () => {
    const v = monitor.intervalValue;
    if (monitor.intervalUnit === 'seconds') {
      return `a cada ${v} ${v === 1 ? 'segundo' : 'segundos'}`;
    }
    if (monitor.intervalUnit === 'minutes') {
      return `a cada ${v} ${v === 1 ? 'minuto' : 'minutos'}`;
    }
    return `a cada ${v} ${v === 1 ? 'hora' : 'horas'}`;
  };

  // Format relative time
  const formatLastChecked = (dateStr?: string) => {
    if (!dateStr) return 'Nunca verificado';
    const diffSeconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSeconds < 5) return 'agora mesmo';
    if (diffSeconds < 60) return `há ${diffSeconds}s`;
    const mins = Math.floor(diffSeconds / 60);
    if (mins < 60) return `há ${mins}m`;
    const hours = Math.floor(mins / 60);
    return `há ${hours}h`;
  };

  const isHealthy = monitor.active && monitor.status === 'healthy';
  const isUnhealthy = monitor.active && monitor.status === 'unhealthy';
  const isPaused = !monitor.active || monitor.status === 'paused';

  // Method badge colors
  const methodColorMap: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    HEAD: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  // Status badge styling
  const renderStatusBadge = () => {
    if (isPaused) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-1.5" />
          Pausado
        </span>
      );
    }
    if (isHealthy) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
          Operacional ({monitor.lastStatusCode || 200})
        </span>
      );
    }
    if (isUnhealthy) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5 animate-ping" />
          Falha ({monitor.lastStatusCode ? `HTTP ${monitor.lastStatusCode}` : 'Sem Resposta'})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mr-1.5" />
        Pendente
      </span>
    );
  };

  // Recent 20 check items
  const recentHistory = [...history].slice(0, 20).reverse();

  return (
    <div
      id={`card-monitor-${monitor.id}`}
      className={`bg-slate-900 border rounded-xl p-5 shadow-sm transition-all duration-200 hover:border-slate-700 flex flex-col justify-between ${
        isUnhealthy
          ? 'border-rose-500/40 shadow-rose-950/20'
          : isHealthy
          ? 'border-slate-800'
          : 'border-slate-800/80 opacity-80'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${methodColorMap[monitor.method] || 'bg-slate-800 text-slate-300'}`}>
                {monitor.method}
              </span>
              <h2 className="text-base font-semibold text-white truncate max-w-xs sm:max-w-md" title={monitor.name}>
                {monitor.name}
              </h2>
              {monitor.headers && Object.keys(monitor.headers).length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-800/40"
                  title={`Headers configurados: ${Object.keys(monitor.headers).join(', ')}`}
                >
                  Headers ({Object.keys(monitor.headers).length})
                </span>
              )}
            </div>

            {/* URL display + quick copy */}
            <div className="flex items-center space-x-2 text-xs text-slate-400 group">
              <span className="font-mono truncate max-w-xs sm:max-w-sm text-slate-300">
                {monitor.url}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                title="Copiar URL"
                className="p-1 hover:text-white text-slate-500 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                title="Abrir no navegador"
                className="p-1 hover:text-white text-slate-500 hover:bg-slate-800 rounded transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {renderStatusBadge()}
            <span className="text-[11px] text-slate-400 flex items-center space-x-1">
              <Clock className="h-3 w-3 inline mr-1 text-slate-500" />
              {formatInterval()}
            </span>
          </div>
        </div>

        {/* Error diagnosis banner if unhealthy */}
        {isUnhealthy && monitor.lastErrorMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="break-all font-mono leading-relaxed">
              {monitor.lastErrorMessage}
            </span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 my-3 text-center">
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Tempo Resposta</span>
            <span className={`text-sm font-semibold flex items-center justify-center space-x-1 ${
              (monitor.lastLatencyMs || 0) > 800 ? 'text-amber-400' : 'text-slate-200'
            }`}>
              <Zap className="h-3.5 w-3.5 text-slate-500" />
              <span>{monitor.lastLatencyMs !== undefined ? `${monitor.lastLatencyMs}ms` : '--'}</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Disponibilidade</span>
            <span className="text-sm font-semibold text-white">
              {monitor.totalChecks > 0 ? `${monitor.uptimePercent}%` : '100%'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">Último Ping</span>
            <span className="text-xs font-medium text-slate-300">
              {formatLastChecked(monitor.lastCheckedAt)}
            </span>
          </div>
        </div>

        {/* Webhook Google Chat / Meet status & Recent Check Bars */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <div className="flex items-center space-x-1.5">
              {monitor.chatWebhookKey ? (
                <span className="inline-flex items-center text-emerald-400 font-medium">
                  <Bell className="h-3 w-3 mr-1 text-emerald-400" />
                  Google Chat / Meet Alerta Ativo
                </span>
              ) : (
                <span className="inline-flex items-center text-slate-500">
                  <BellOff className="h-3 w-3 mr-1 text-slate-500" />
                  Sem chave de alerta configurada
                </span>
              )}
            </div>
            <span className="text-slate-400">{monitor.totalChecks} verificações</span>
          </div>

          {/* Sparkline / Ping status bars */}
          <div className="flex items-center space-x-1 h-3 bg-slate-950/70 p-1 rounded-md border border-slate-800/60">
            {recentHistory.length === 0 ? (
              <span className="text-[10px] text-slate-400 px-1 italic">Nenhum histórico registrado</span>
            ) : (
              recentHistory.map((item, idx) => (
                <div
                  key={item.id || idx}
                  title={`${item.status === 'success' ? 'OK' : 'Falha'} (${item.statusCode || 'Err'} - ${item.latencyMs}ms) em ${new Date(item.timestamp).toLocaleTimeString()}`}
                  className={`flex-1 h-full rounded-xs transition-colors cursor-pointer ${
                    item.status === 'success'
                      ? 'bg-emerald-500 hover:bg-emerald-400'
                      : 'bg-rose-500 hover:bg-rose-400'
                  }`}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            id={`btn-ping-now-${monitor.id}`}
            onClick={handleManualCheck}
            disabled={isChecking}
            title="Verificar agora"
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Verificar</span>
          </button>

          <button
            type="button"
            id={`btn-toggle-${monitor.id}`}
            onClick={() => onToggleActive(monitor.id)}
            title={monitor.active ? 'Pausar monitoramento' : 'Retomar monitoramento'}
            className={`inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition cursor-pointer ${
              monitor.active
                ? 'text-slate-300 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 border-slate-700/60'
                : 'text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800/50'
            }`}
          >
            {monitor.active ? (
              <>
                <Pause className="h-3 w-3 text-amber-400" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 text-emerald-400" />
                <span>Ativar</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            id={`btn-history-${monitor.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory(monitor);
            }}
            title="Ver histórico de pings"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            <BarChart2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            id={`btn-edit-${monitor.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(monitor);
            }}
            title="Editar monitor"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <button
            type="button"
            id={`btn-delete-${monitor.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(monitor.id);
            }}
            title="Excluir monitor"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
