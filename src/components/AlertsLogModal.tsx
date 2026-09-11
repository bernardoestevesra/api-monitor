import React from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { AlertLog } from '../types';

interface AlertsLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertLog[];
  onOpenTestModal: () => void;
}

export const AlertsLogModal: React.FC<AlertsLogModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onOpenTestModal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Registro de Alertas (Google Chat / Meet)</h2>
              <p className="text-xs text-slate-400">Notificações disparadas automaticamente e testes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2.5">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs space-y-2">
              <p>Nenhum alerta disparado até o momento.</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTestModal();
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-blue-400 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/50 rounded-lg transition cursor-pointer"
              >
                <Send className="h-3 w-3" />
                <span>Testar envio agora</span>
              </button>
            </div>
          ) : (
            alerts.map((log) => {
              const isTest = log.type === 'test';
              const isRecovery = log.type === 'recovery';
              const isFailure = log.type === 'failure';

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    !log.success
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : isFailure
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isRecovery
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {log.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                      )}
                      <span className="font-semibold text-white">{log.monitorName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isFailure
                            ? 'bg-rose-500/20 text-rose-300'
                            : isRecovery
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {isFailure ? 'Falha' : isRecovery ? 'Recuperação' : 'Teste'}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-slate-300">{log.message}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 font-mono">
                    <span>Destino: {log.destination}</span>
                    <span>
                      {log.success
                        ? `Entrega confirmada (HTTP ${log.httpStatus || 200})`
                        : log.errorDetails || 'Erro de entrega'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTestModal();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Testar Envio no Chat</span>
          </button>

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
