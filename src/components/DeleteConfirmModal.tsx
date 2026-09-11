import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { ApiMonitor } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitor: ApiMonitor | null;
  onConfirm: (id: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  monitor,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !monitor) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(monitor.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white">Excluir Monitor de API</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300 mb-1">Ação Irreversível</p>
              <p className="leading-relaxed text-slate-300">
                Tem certeza que deseja remover permanentemente o monitoramento desta API? Todas as métricas, histórico de pings e agendamentos serão excluídos.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {monitor.method}
              </span>
              <span className="text-sm font-semibold text-white truncate">
                {monitor.name}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 truncate">
              {monitor.url}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-confirm-delete-monitor"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-lg shadow-sm shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
