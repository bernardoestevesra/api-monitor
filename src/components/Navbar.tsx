import React from 'react';
import { Activity, Plus, Bell, RefreshCw, Send, Cloud } from 'lucide-react';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenTestWebhookModal: () => void;
  onOpenAlertsModal: () => void;
  onOpenBackupModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeCount: number;
  totalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenTestWebhookModal,
  onOpenAlertsModal,
  onOpenBackupModal,
  onRefresh,
  isRefreshing,
  activeCount,
  totalCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">Monitor de APIs</h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Google Meet / Chat Alertas
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {activeCount} de {totalCount} APIs em monitoramento contínuo
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            id="btn-refresh-monitors"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Atualizar status"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            id="btn-open-backup-modal"
            onClick={onOpenBackupModal}
            title="Banco de Dados Firestore & Backup"
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 hover:text-cyan-200 rounded-lg border border-cyan-800/40 transition cursor-pointer"
          >
            <Cloud className="h-4 w-4 text-cyan-400" />
            <span className="hidden lg:inline">Nuvem & Backup</span>
          </button>

          <button
            id="btn-open-alerts-log"
            onClick={onOpenAlertsModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700/60 transition cursor-pointer"
          >
            <Bell className="h-4 w-4 text-amber-400" />
            <span className="hidden md:inline">Histórico de Alertas</span>
          </button>

          <button
            id="btn-open-test-webhook"
            onClick={onOpenTestWebhookModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden sm:inline">Testar Chave Chat</span>
          </button>

          <button
            id="btn-new-monitor"
            onClick={onOpenAddModal}
            className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/30 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar API</span>
          </button>
        </div>
      </div>
    </header>
  );
};
