import React, { useState, useRef } from 'react';
import { X, Cloud, Download, Upload, CheckCircle2, AlertCircle, Database, ShieldCheck } from 'lucide-react';
import { ApiMonitor } from '../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitorsCount: number;
  onBackupRestored: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  monitorsCount,
  onBackupRestored,
  showToast,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    window.open('/api/backup/export', '_blank');
    showToast('Download do backup JSON iniciado com sucesso!', 'success');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('O arquivo selecionado não é um JSON válido.');
      }

      const listToImport: ApiMonitor[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.monitors)
        ? parsed.monitors
        : [];

      if (listToImport.length === 0) {
        throw new Error('Nenhum monitor de API encontrado dentro do arquivo de backup.');
      }

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitors: listToImport }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao importar dados de backup.');
      }

      showToast(`${data.count || listToImport.length} monitores importados e salvos no Firestore!`, 'success');
      onBackupRestored();
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Falha ao processar arquivo de backup.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Banco em Nuvem & Backup</h2>
              <p className="text-xs text-slate-400">Persistência permanente no Firebase Firestore</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cloud Status Card */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Armazenamento em Nuvem Ativo</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Conectado
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Seus monitores e configurações são sincronizados automaticamente com o <strong>Firebase Firestore</strong>. Mesmo se o contêiner reiniciar, seus dados estão gravados na nuvem de forma permanente.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500 block">Provedor:</span>
              <span className="font-mono text-slate-200">Firebase Firestore</span>
            </div>
            <div>
              <span className="text-slate-500 block">APIs Cadastradas:</span>
              <span className="font-semibold text-slate-200">{monitorsCount} monitor(es)</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Backup Local (JSON)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export */}
            <button
              type="button"
              id="btn-export-backup"
              onClick={handleExport}
              className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 transition cursor-pointer text-xs font-medium"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Exportar Backup (.json)</span>
            </button>

            {/* Import */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input-backup"
              />
              <button
                type="button"
                id="btn-import-backup"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 transition cursor-pointer text-xs font-medium disabled:opacity-50"
              >
                <Upload className={`h-4 w-4 text-cyan-400 ${isImporting ? 'animate-bounce' : ''}`} />
                <span>{isImporting ? 'Importando...' : 'Importar Backup (.json)'}</span>
              </button>
            </div>
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{importError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
