import React from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Zap, Bell } from 'lucide-react';
import { ApiMonitor, CheckHistoryEntry } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitor: ApiMonitor | null;
  history: CheckHistoryEntry[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  monitor,
  history,
}) => {
  if (!isOpen || !monitor) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">Histórico de Verificações</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                {monitor.method}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate max-w-md mt-0.5">{monitor.url}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick summary strip */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-center text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Disponibilidade</span>
            <span className="font-semibold text-emerald-400">{monitor.uptimePercent}%</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Última Latência</span>
            <span className="font-semibold text-amber-300">
              {monitor.lastLatencyMs !== undefined ? `${monitor.lastLatencyMs}ms` : '--'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Total de Checagens</span>
            <span className="font-semibold text-white">{monitor.totalChecks}</span>
          </div>
        </div>

        {/* History List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              Nenhuma verificação gravada ainda para este monitor.
            </div>
          ) : (
            history.map((entry) => {
              const isSuccess = entry.status === 'success';
              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                    isSuccess
                      ? 'bg-slate-950/50 border-slate-800/80'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {isSuccess ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono font-bold ${isSuccess ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {entry.statusCode ? `HTTP ${entry.statusCode}` : 'FALHA DE REDE'}
                        </span>
                        {entry.alertSent && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Bell className="h-2.5 w-2.5 mr-1" />
                            Alerta Meet/Chat Enviado
                          </span>
                        )}
                      </div>
                      {entry.errorMessage && (
                        <p className="text-rose-400 font-mono text-[11px] mt-0.5">{entry.errorMessage}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-right shrink-0">
                    <div className="flex items-center space-x-1 text-slate-400 font-mono">
                      <Zap className="h-3 w-3 text-amber-400" />
                      <span>{entry.latencyMs}ms</span>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
