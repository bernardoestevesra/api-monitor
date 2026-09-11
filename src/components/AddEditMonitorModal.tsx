import React, { useState, useEffect } from 'react';
import { X, Send, HelpCircle, Check, AlertCircle, Sparkles } from 'lucide-react';
import { ApiMonitor, CreateMonitorInput, HttpMethod, IntervalUnit } from '../types';

interface AddEditMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateMonitorInput, id?: string) => Promise<void>;
  editingMonitor?: ApiMonitor | null;
  onTestWebhook: (key: string, name: string, url: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const AddEditMonitorModal: React.FC<AddEditMonitorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMonitor,
  onTestWebhook,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [intervalValue, setIntervalValue] = useState<number>(30);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('seconds');
  const [chatWebhookKey, setChatWebhookKey] = useState('');
  const [alertOnFailure, setAlertOnFailure] = useState(true);
  const [alertOnRecovery, setAlertOnRecovery] = useState(true);
  const [expectedStatus, setExpectedStatus] = useState<number>(200);
  const [timeoutMs, setTimeoutMs] = useState<number>(5000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [headersJson, setHeadersJson] = useState('');
  const [requestBody, setRequestBody] = useState('');

  // UI States
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (editingMonitor) {
      setName(editingMonitor.name);
      setUrl(editingMonitor.url);
      setMethod(editingMonitor.method);
      setIntervalValue(editingMonitor.intervalValue);
      setIntervalUnit(editingMonitor.intervalUnit);
      setChatWebhookKey(editingMonitor.chatWebhookKey || '');
      setAlertOnFailure(editingMonitor.alertOnFailure);
      setAlertOnRecovery(editingMonitor.alertOnRecovery);
      setExpectedStatus(editingMonitor.expectedStatus);
      setTimeoutMs(editingMonitor.timeoutMs);
      setHeadersJson(
        editingMonitor.headers && Object.keys(editingMonitor.headers).length > 0
          ? JSON.stringify(editingMonitor.headers, null, 2)
          : ''
      );
      setRequestBody(editingMonitor.body || '');
      if (
        (editingMonitor.headers && Object.keys(editingMonitor.headers).length > 0) ||
        editingMonitor.body
      ) {
        setShowAdvanced(true);
      }
    } else {
      setName('');
      setUrl('');
      setMethod('GET');
      setIntervalValue(30);
      setIntervalUnit('seconds');
      setChatWebhookKey('');
      setAlertOnFailure(true);
      setAlertOnRecovery(true);
      setExpectedStatus(200);
      setTimeoutMs(5000);
      setHeadersJson('');
      setRequestBody('');
    }
    setTestResult(null);
    setFormError('');
  }, [editingMonitor, isOpen]);

  if (!isOpen) return null;

  const minAllowedValue = intervalUnit === 'seconds' ? 3 : 1;

  const handleApplyPreset = (val: number, unit: IntervalUnit) => {
    setIntervalUnit(unit);
    setIntervalValue(val);
  };

  const handleUnitChange = (unit: IntervalUnit) => {
    setIntervalUnit(unit);
    if (unit === 'seconds' && intervalValue < 3) {
      setIntervalValue(3);
    }
  };

  const handleTestChatKey = async () => {
    if (!chatWebhookKey.trim()) {
      setTestResult({
        success: false,
        msg: 'Informe a chave ou URL do webhook para testar.',
      });
      return;
    }

    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await onTestWebhook(
        chatWebhookKey.trim(),
        name.trim() || 'API de Teste',
        url.trim() || 'https://exemplo.com/api'
      );
      if (res.success) {
        setTestResult({
          success: true,
          msg: 'Alerta de teste enviado com sucesso para o chat no Meet/Chat!',
        });
      } else {
        setTestResult({
          success: false,
          msg: res.error || 'Falha ao enviar mensagem para o webhook.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: err.message || 'Erro inesperado ao testar webhook.',
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!url.trim()) {
      setFormError('Por favor, informe a URL da API.');
      return;
    }

    const numericInterval = Number(intervalValue) || 1;
    if (intervalUnit === 'seconds' && numericInterval < 3) {
      setFormError('Para o intervalo em segundos, a quantidade mínima permitida é de 3 segundos.');
      return;
    }
    if (numericInterval < 1) {
      setFormError('A quantidade de tempo do intervalo deve ser de pelo menos 1.');
      return;
    }

    let parsedHeaders: Record<string, string> | null = null;
    const cleanHeaders = headersJson.trim();
    if (cleanHeaders) {
      try {
        const parsed = JSON.parse(cleanHeaders);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setFormError('O campo de Headers deve ser um objeto JSON (ex: {"Authorization": "Bearer ..."})');
          return;
        }
        parsedHeaders = Object.keys(parsed).length > 0 ? parsed : null;
      } catch {
        setFormError('O campo de Headers deve ser um JSON válido (ex: {"Authorization": "Bearer ..."})');
        return;
      }
    } else {
      parsedHeaders = null;
    }

    const cleanBody = requestBody.trim();
    const finalBody = cleanBody ? cleanBody : null;

    setIsSubmitting(true);
    try {
      await onSave(
        {
          name: name.trim() || url.trim(),
          url: url.trim(),
          method,
          intervalValue: Number(intervalValue) || 30,
          intervalUnit,
          chatWebhookKey: chatWebhookKey.trim(),
          alertOnFailure,
          alertOnRecovery,
          expectedStatus: Number(expectedStatus) || 200,
          timeoutMs: Number(timeoutMs) || 5000,
          headers: parsedHeaders,
          body: finalBody,
        },
        editingMonitor?.id
      );
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar o monitor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div>
            <h2 className="text-lg font-bold text-white">
              {editingMonitor ? 'Editar Monitor de API' : 'Adicionar Nova API para Monitoramento'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure a URL, tempo de intervalo e alertas no chat do Meet/Google Chat
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* URL & Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              URL da API *
            </label>
            <div className="flex rounded-lg shadow-xs overflow-hidden border border-slate-700 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
              <select
                id="select-http-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="bg-slate-800 text-xs font-bold text-slate-200 px-3 border-r border-slate-700 outline-hidden cursor-pointer"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input
                id="input-api-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.exemplo.com/v1/health"
                required
                className="flex-1 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Name / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome do Serviço / Identificador
            </label>
            <input
              id="input-api-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Microsserviço de Pagamentos, API Autenticação..."
              className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          {/* Interval Configuration (Seconds, Minutes, Hours) */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Tempo de Intervalo entre Verificações *
              </label>
              <span className="text-[11px] text-emerald-400 font-medium">
                Pode ser em segundos, minutos ou horas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Quantidade</label>
                <input
                  id="input-interval-value"
                  type="number"
                  min={minAllowedValue}
                  max="86400"
                  value={intervalValue}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setIntervalValue(isNaN(parsed) ? 1 : parsed);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 outline-hidden"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Mínimo: {intervalUnit === 'seconds' ? '3 segundos' : intervalUnit === 'minutes' ? '1 minuto' : '1 hora'}
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Unidade de Tempo</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleUnitChange('seconds')}
                    className={`py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                      intervalUnit === 'seconds'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Segundos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitChange('minutes')}
                    className={`py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                      intervalUnit === 'minutes'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Minutos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitChange('hours')}
                    className={`py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                      intervalUnit === 'hours'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Horas
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Preset Chips */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Atalhos rápidos:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(15, 'seconds')}
                className="px-2 py-0.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                15 seg
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(30, 'seconds')}
                className="px-2 py-0.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                30 seg
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(1, 'minutes')}
                className="px-2 py-0.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                1 min
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(5, 'minutes')}
                className="px-2 py-0.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                5 min
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(15, 'minutes')}
                className="px-2 py-0.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                15 min
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(1, 'hours')}
                className="px-2 py-0.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                1 hora
              </button>
            </div>
          </div>

          {/* Google Chat / Meet Webhook Key */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <span>Chave ou Webhook do Chat / Meet *</span>
              </label>
              <button
                type="button"
                onClick={() => setShowHelpGuide(!showHelpGuide)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>{showHelpGuide ? 'Ocultar ajuda' : 'Como obter a chave?'}</span>
              </button>
            </div>

            {showHelpGuide && (
              <div className="mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-blue-300 flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Passo a passo no Google Chat / Google Meet:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Abra o seu espaço (Space/Chat) no Google Chat ou vinculado ao Google Meet.</li>
                  <li>Clique no nome do espaço no topo e selecione <strong>Apps e integrações</strong>.</li>
                  <li>Clique em <strong>Webhooks</strong> e depois em <strong>Adicionar webhook</strong>.</li>
                  <li>Dê o nome de <em>"Alertas de API"</em> e copie a URL gerada.</li>
                  <li>Cole aqui a URL completa ou a chave (<code>key=...&token=...</code>).</li>
                </ol>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="input-chat-webhook-key"
                type="text"
                value={chatWebhookKey}
                onChange={(e) => setChatWebhookKey(e.target.value)}
                placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=AIza...&token=..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 outline-hidden"
              />
              <button
                type="button"
                id="btn-test-chat-key"
                onClick={handleTestChatKey}
                disabled={testingWebhook}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-blue-300 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                <Send className={`h-3 w-3 ${testingWebhook ? 'animate-spin' : ''}`} />
                <span>{testingWebhook ? 'Enviando...' : 'Testar Envio'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-2.5 p-2 rounded text-xs flex items-center space-x-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {testResult.success ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span className="break-words">{testResult.msg}</span>
              </div>
            )}

            {/* Notification checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alertOnFailure}
                  onChange={(e) => setAlertOnFailure(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Enviar alerta em toda verificação com erro (falha contínua)</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alertOnRecovery}
                  onChange={(e) => setAlertOnRecovery(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Enviar alerta quando se restabelecer (recuperação)</span>
              </label>
            </div>
          </div>

          {/* Collapsible Advanced Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <span>{showAdvanced ? '▼ Ocultar Opções Avançadas' : '▶ Configurações Avançadas (Status Esperado, Headers, Timeout)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Status HTTP Esperado</label>
                    <input
                      type="number"
                      value={expectedStatus}
                      onChange={(e) => setExpectedStatus(parseInt(e.target.value, 10) || 200)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Timeout Máximo (ms)</label>
                    <input
                      type="number"
                      value={timeoutMs}
                      onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10) || 5000)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 block">Headers HTTP (formato JSON opcional)</label>
                    {headersJson.trim() && (
                      <button
                        type="button"
                        onClick={() => setHeadersJson('')}
                        className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Limpar / Remover Headers
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={headersJson}
                    onChange={(e) => setHeadersJson(e.target.value)}
                    placeholder='{"Authorization": "Bearer token123", "X-Custom": "valor"}'
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
                  />
                </div>

                {['POST', 'PUT'].includes(method) && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400 block">Corpo da Requisição (Body)</label>
                      {requestBody.trim() && (
                        <button
                          type="button"
                          onClick={() => setRequestBody('')}
                          className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                        >
                          Limpar Body
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      placeholder='{"action": "ping"}'
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-submit-monitor"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : editingMonitor ? 'Salvar Alterações' : 'Iniciar Monitoramento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
