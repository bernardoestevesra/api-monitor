/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Bell, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  HelpCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { ApiMonitor, CheckHistoryEntry, AlertLog, CreateMonitorInput } from './types';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { MonitorCard } from './components/MonitorCard';
import { AddEditMonitorModal } from './components/AddEditMonitorModal';
import { WebhookTestModal } from './components/WebhookTestModal';
import { HistoryModal } from './components/HistoryModal';
import { AlertsLogModal } from './components/AlertsLogModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { BackupModal } from './components/BackupModal';

export default function App() {
  const [monitors, setMonitors] = useState<ApiMonitor[]>([]);
  const [checkHistories, setCheckHistories] = useState<Record<string, CheckHistoryEntry[]>>({});
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'unhealthy' | 'paused'>('all');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<ApiMonitor | null>(null);
  const [isTestWebhookOpen, setIsTestWebhookOpen] = useState(false);
  const [isAlertsLogOpen, setIsAlertsLogOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<ApiMonitor | null>(null);
  const [monitorToDelete, setMonitorToDelete] = useState<ApiMonitor | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch all data from backend
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [monitorsRes, alertsRes] = await Promise.all([
        fetch('/api/monitors'),
        fetch('/api/alerts'),
      ]);

      if (monitorsRes.ok) {
        const data = await monitorsRes.json();
        const loadedMonitors: ApiMonitor[] = data.monitors || [];
        setMonitors(loadedMonitors);

        // Fetch recent check history for each monitor
        const historyMap: Record<string, CheckHistoryEntry[]> = {};
        await Promise.all(
          loadedMonitors.map(async (m) => {
            try {
              const hRes = await fetch(`/api/monitors/${m.id}/history`);
              if (hRes.ok) {
                const hData = await hRes.json();
                historyMap[m.id] = hData.history || [];
              }
            } catch {
              // Ignore individual history errors
            }
          })
        );
        setCheckHistories(historyMap);
      }

      if (alertsRes.ok) {
        const aData = await alertsRes.json();
        setAlerts(aData.alerts || []);
      }
    } catch (err) {
      console.error('Falha ao sincronizar com servidor:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic polling every 4 seconds to reflect backend timers
  useEffect(() => {
    fetchData();
    const pollInterval = setInterval(() => {
      fetchData(true);
    }, 4000);
    return () => clearInterval(pollInterval);
  }, [fetchData]);

  // Actions
  const handleSaveMonitor = async (data: CreateMonitorInput, id?: string) => {
    const isEdit = !!id;
    const url = isEdit ? `/api/monitors/${id}` : '/api/monitors';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao salvar monitor');
    }

    showToast(
      isEdit ? 'Monitor atualizado com sucesso!' : 'Novo monitor de API cadastrado com sucesso!',
      'success'
    );
    await fetchData(true);
  };

  const handleDeleteClick = (id: string) => {
    const target = monitors.find((m) => m.id === id);
    if (!target) return;
    setMonitorToDelete(target);
  };

  const handleConfirmDelete = async (id: string) => {
    const target = monitors.find((m) => m.id === id);
    const targetName = target?.name || 'Monitor';

    // Optimistically update UI immediately
    setMonitors((prev) => prev.filter((m) => m.id !== id));

    try {
      const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Monitor "${targetName}" removido com sucesso.`, 'info');
      } else {
        showToast('Falha ao remover monitor no servidor.', 'error');
      }
      await fetchData(true);
    } catch {
      showToast('Erro de conexão ao excluir monitor.', 'error');
      await fetchData(true);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/monitors/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const state = data.monitor.active ? 'ativado' : 'pausado';
        showToast(`Monitor ${state}.`, 'info');
        await fetchData(true);
      }
    } catch {
      showToast('Erro ao alternar status do monitor.', 'error');
    }
  };

  const handleTriggerCheck = async (id: string) => {
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const status = data.result?.status === 'success' ? 'OK (200)' : 'Falha';
        showToast(`Verificação concluída: ${status} (${data.result?.latencyMs}ms)`, 'info');
        await fetchData(true);
      }
    } catch {
      showToast('Erro ao executar verificação imediata.', 'error');
    }
  };

  const handleTestWebhook = async (webhookKey: string, monitorName: string, url: string) => {
    const res = await fetch('/api/test-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookKey, monitorName, url }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await fetchData(true);
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'Erro ao enviar alerta' };
  };

  // Pre-seed a test failing API to test failure alerts easily
  const handleAddFailingTestApi = async () => {
    try {
      await handleSaveMonitor({
        name: 'API Teste de Indisponibilidade (HTTP 500)',
        url: 'https://httpbin.org/status/500',
        method: 'GET',
        intervalValue: 15,
        intervalUnit: 'seconds',
        expectedStatus: 200,
        chatWebhookKey: '',
        alertOnFailure: true,
        alertOnRecovery: true,
      });
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filtered monitors
  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'healthy') return m.active && m.status === 'healthy';
    if (statusFilter === 'unhealthy') return m.active && m.status === 'unhealthy';
    if (statusFilter === 'paused') return !m.active || m.status === 'paused';
    return true;
  });

  const activeCount = monitors.filter((m) => m.active).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Navigation Header */}
      <Navbar
        onOpenAddModal={() => {
          setEditingMonitor(null);
          setIsAddEditOpen(true);
        }}
        onOpenTestWebhookModal={() => setIsTestWebhookOpen(true)}
        onOpenAlertsModal={() => setIsAlertsLogOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onRefresh={() => fetchData(false)}
        isRefreshing={isRefreshing}
        activeCount={activeCount}
        totalCount={monitors.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* System Notification Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-medium border ${
                toast.type === 'success'
                  ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                  : toast.type === 'error'
                  ? 'bg-slate-900 border-rose-500/40 text-rose-300'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              ) : (
                <Bell className="h-4 w-4 text-blue-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Operational Statistics Bar */}
        <StatsBar monitors={monitors} />

        {/* Instructions banner for Google Chat / Meet webhook */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-white block">
                Integração Direta com Google Meet & Google Chat
              </span>
              <p className="text-slate-400 mt-0.5 max-w-2xl">
                Monitore qualquer URL com intervalos em <strong>segundos</strong>, <strong>minutos</strong> ou <strong>horas</strong>. 
                Quando uma API cair ou voltar ao normal, o sistema envia automaticamente alertas detalhados para o chat da sala no Meet ou canal no Google Chat usando a chave do webhook.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsTestWebhookOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-medium transition cursor-pointer"
            >
              <Send className="h-3 w-3" />
              <span>Validar Minha Chave</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="input-search-monitors"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou URL..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-hidden"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({monitors.length})
            </button>
            <button
              onClick={() => setStatusFilter('healthy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                statusFilter === 'healthy'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Operacionais ({monitors.filter((m) => m.active && m.status === 'healthy').length})
            </button>
            <button
              onClick={() => setStatusFilter('unhealthy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                statusFilter === 'unhealthy'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Em Falha ({monitors.filter((m) => m.active && m.status === 'unhealthy').length})
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                statusFilter === 'paused'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pausadas ({monitors.filter((m) => !m.active || m.status === 'paused').length})
            </button>
          </div>
        </div>

        {/* Monitors Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mb-3" />
            <p className="text-xs">Carregando monitoramento de APIs...</p>
          </div>
        ) : filteredMonitors.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-8">
            <div className="h-12 w-12 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 mb-4">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery ? 'Nenhum monitor corresponde à pesquisa' : 'Nenhuma API cadastrada'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Adicione os endpoints da sua infraestrutura para monitoramento de disponibilidade e receba alertas diretamente no Google Chat / Meet.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => {
                  setEditingMonitor(null);
                  setIsAddEditOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm shadow-emerald-600/30 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Primeira API</span>
              </button>
              <button
                onClick={handleAddFailingTestApi}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <span>Adicionar API Teste (HTTP 500)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMonitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                history={checkHistories[monitor.id] || []}
                onTriggerCheck={handleTriggerCheck}
                onToggleActive={handleToggleActive}
                onEdit={(m) => {
                  setEditingMonitor(m);
                  setIsAddEditOpen(true);
                }}
                onDelete={handleDeleteClick}
                onOpenHistory={(m) => setHistoryTarget(m)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Monitor de APIs • Verificação Contínua &amp; Notificações para Google Chat / Meet</span>
          <span className="text-slate-400">Intervalos configuráveis em segundos, minutos ou horas</span>
        </div>
      </footer>

      {/* Modals */}
      <AddEditMonitorModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingMonitor(null);
        }}
        onSave={handleSaveMonitor}
        editingMonitor={editingMonitor}
        onTestWebhook={handleTestWebhook}
      />

      <WebhookTestModal
        isOpen={isTestWebhookOpen}
        onClose={() => setIsTestWebhookOpen(false)}
        onTestWebhook={handleTestWebhook}
      />

      <HistoryModal
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        monitor={historyTarget}
        history={historyTarget ? checkHistories[historyTarget.id] || [] : []}
      />

      <AlertsLogModal
        isOpen={isAlertsLogOpen}
        onClose={() => setIsAlertsLogOpen(false)}
        alerts={alerts}
        onOpenTestModal={() => setIsTestWebhookOpen(true)}
      />

      <DeleteConfirmModal
        isOpen={!!monitorToDelete}
        monitor={monitorToDelete}
        onClose={() => setMonitorToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        monitorsCount={monitors.length}
        onBackupRestored={() => fetchData(false)}
        showToast={showToast}
      />
    </div>
  );
}
