import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertTriangle, HelpCircle, ExternalLink } from 'lucide-react';

interface WebhookTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestWebhook: (key: string, name: string, url: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const WebhookTestModal: React.FC<WebhookTestModalProps> = ({
  isOpen,
  onClose,
  onTestWebhook,
}) => {
  const [webhookKey, setWebhookKey] = useState('');
  const [testServiceName, setTestServiceName] = useState('Serviço de Produção (Teste)');
  const [testEndpoint, setTestEndpoint] = useState('https://api.empresa.com.br/health');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookKey.trim()) return;

    setIsLoading(true);
    setResult(null);
    try {
      const res = await onTestWebhook(
        webhookKey.trim(),
        testServiceName.trim(),
        testEndpoint.trim()
      );
      if (res.success) {
        setResult({
          success: true,
          message: 'Mensagem de teste entregue com sucesso no chat do Google Meet / Google Chat! Verifique a sua sala ou espaço.',
        });
      } else {
        setResult({
          success: false,
          message: res.error || 'Falha ao enviar mensagem para o Google Chat. Verifique se a chave está correta.',
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Erro inesperado na conexão.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Testar Notificações no Google Chat / Meet</h2>
              <p className="text-xs text-slate-400">Valide a chave do webhook antes de ativar alertas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSendTest} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Chave ou URL do Webhook do Google Chat / Meet *
            </label>
            <input
              id="input-modal-test-webhook-key"
              type="text"
              required
              value={webhookKey}
              onChange={(e) => setWebhookKey(e.target.value)}
              placeholder="Cole aqui a URL ou key do webhook gerado no espaço..."
              className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nome da API no Teste</label>
              <input
                type="text"
                value={testServiceName}
                onChange={(e) => setTestServiceName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">URL da API no Teste</label>
              <input
                type="text"
                value={testEndpoint}
                onChange={(e) => setTestEndpoint(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Guide box */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center space-x-1 text-slate-300 font-medium">
              <HelpCircle className="h-3.5 w-3.5 text-blue-400" />
              <span>Onde encontrar a chave no Google Chat / Meet?</span>
            </div>
            <p>
              No Google Chat (web ou app) ou na sala do Meet integrada ao Google Workspace:
            </p>
            <p className="text-slate-300">
              Espaço &gt; <strong>Apps e integrações</strong> &gt; <strong>Webhooks</strong> &gt; <strong>Adicionar webhook</strong>.
            </p>
          </div>

          {result && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start space-x-2.5 ${
                result.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
              )}
              <div className="space-y-1">
                <span className="font-semibold block">{result.success ? 'Sucesso!' : 'Atenção:'}</span>
                <p className="leading-relaxed">{result.message}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={isLoading || !webhookKey.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/30 transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Send className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Enviando Alerta...' : 'Disparar Alerta de Teste'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
