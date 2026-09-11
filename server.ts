import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { ApiMonitor, CheckHistoryEntry, AlertLog, CreateMonitorInput, IntervalUnit } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Firebase Firestore setup
const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(fbApp);

// Local file persistence cache setup
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'monitors.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory state
let monitors: ApiMonitor[] = [];
let checkHistory: Record<string, CheckHistoryEntry[]> = {};
let alertLogs: AlertLog[] = [];
const activeTimers: Map<string, NodeJS.Timeout> = new Map();

async function saveMonitorToFirestore(monitor: ApiMonitor) {
  try {
    const docRef = doc(db, 'monitors', monitor.id);
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(monitor)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.error(`Erro ao salvar monitor ${monitor.id} no Firestore:`, err);
  }
}

async function deleteMonitorFromFirestore(monitorId: string) {
  try {
    const docRef = doc(db, 'monitors', monitorId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Erro ao remover monitor ${monitorId} do Firestore:`, err);
  }
}

async function saveAlertLogToFirestore(log: AlertLog) {
  try {
    const docRef = doc(db, 'alertLogs', log.id);
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(log)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error(`Erro ao salvar log no Firestore:`, err);
  }
}

function calculateIntervalMs(value: number, unit: IntervalUnit): number {
  const safeVal = Math.max(1, Number(value) || 30);
  switch (unit) {
    case 'seconds':
      return Math.max(3000, safeVal * 1000); // Minimum 3s to prevent network flooding
    case 'minutes':
      return safeVal * 60 * 1000;
    case 'hours':
      return safeVal * 60 * 60 * 1000;
    default:
      return 30 * 1000;
  }
}

function normalizeWebhookUrl(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  if (trimmed.startsWith('spaces/')) {
    return `https://chat.googleapis.com/v1/${trimmed}`;
  }
  if (trimmed.includes('key=') || trimmed.includes('token=')) {
    // If user entered key/token parameter string
    return `https://chat.googleapis.com/v1/spaces/messages?${trimmed}`;
  }
  // If user entered just a raw key
  return `https://chat.googleapis.com/v1/spaces/messages?key=${trimmed}`;
}

async function sendGoogleChatAlert(
  destination: string,
  title: string,
  details: {
    monitorName: string;
    url: string;
    type: 'failure' | 'recovery' | 'test';
    statusText: string;
    latencyMs?: number;
    error?: string;
  }
): Promise<{ success: boolean; status?: number; error?: string }> {
  const url = normalizeWebhookUrl(destination);
  if (!url) {
    return { success: false, error: 'Chave ou URL do webhook não fornecida.' };
  }

  const isFailure = details.type === 'failure';
  const isRecovery = details.type === 'recovery';
  const isTest = details.type === 'test';

  const iconEmoji = isFailure ? '🚨' : isRecovery ? '✅' : '🧪';
  const headerColor = isFailure ? '#DC2626' : isRecovery ? '#16A34A' : '#2563EB';
  const typeLabel = isFailure ? 'FALHA NA API' : isRecovery ? 'RECUPERAÇÃO DA API' : 'TESTE DE CONEXÃO';

  const timestampStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Plain text fallback
  const plainText = `${iconEmoji} *[${typeLabel}] ${details.monitorName}*\n` +
    `• *URL:* ${details.url}\n` +
    `• *Status:* ${details.statusText}\n` +
    (details.latencyMs !== undefined ? `• *Latência:* ${details.latencyMs}ms\n` : '') +
    (details.error ? `• *Erro:* ${details.error}\n` : '') +
    `• *Data/Hora:* ${timestampStr}`;

  // Rich Google Chat Card
  const payload = {
    text: plainText,
    cardsV2: [
      {
        cardId: `alert-${Date.now()}`,
        card: {
          header: {
            title: `${iconEmoji} ${title}`,
            subtitle: `${typeLabel} • ${timestampStr}`,
          },
          sections: [
            {
              widgets: [
                {
                  decoratedText: {
                    topLabel: 'Nome da API',
                    text: details.monitorName,
                  },
                },
                {
                  decoratedText: {
                    topLabel: 'Endpoint URL',
                    text: details.url,
                  },
                },
                {
                  decoratedText: {
                    topLabel: 'Status da Verificação',
                    text: details.statusText,
                  },
                },
                ...(details.latencyMs !== undefined ? [{
                  decoratedText: {
                    topLabel: 'Tempo de Resposta',
                    text: `${details.latencyMs} ms`,
                  },
                }] : []),
                ...(details.error ? [{
                  decoratedText: {
                    topLabel: 'Diagnóstico de Erro',
                    text: details.error,
                  },
                }] : []),
              ],
            },
          ],
        },
      },
    ],
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true, status: res.status };
    } else {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        status: res.status,
        error: `Google Chat retornou HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Tempo limite esgotado ao chamar Google Chat' : err.message || 'Falha de rede ao enviar alerta',
    };
  }
}

// Load persisted data or initialize defaults from Firestore & local cache
async function loadData() {
  // 1. Read local cache first for instant response
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      monitors = parsed.monitors || [];
      checkHistory = parsed.checkHistory || {};
      alertLogs = parsed.alertLogs || [];
      console.log(`Carregados ${monitors.length} monitores do cache local.`);
    }
  } catch (err) {
    console.error('Erro ao ler arquivo de dados local:', err);
  }

  // 2. Load and synchronize from Firebase Firestore (permanent persistence)
  try {
    console.log('Sincronizando monitores com o Firebase Firestore...');
    const monitorsCol = collection(db, 'monitors');
    const snapshot = await getDocs(monitorsCol);

    if (!snapshot.empty) {
      const firestoreMonitors: ApiMonitor[] = [];
      snapshot.forEach((docSnap) => {
        firestoreMonitors.push(docSnap.data() as ApiMonitor);
      });
      firestoreMonitors.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      monitors = firestoreMonitors;
      console.log(`Carregados ${monitors.length} monitores do Firebase Firestore com sucesso.`);

      // Also try to load alert logs from Firestore
      try {
        const logsCol = collection(db, 'alertLogs');
        const logsQuery = query(logsCol, orderBy('timestamp', 'desc'), limit(50));
        const logsSnap = await getDocs(logsQuery);
        if (!logsSnap.empty) {
          const loadedLogs: AlertLog[] = [];
          logsSnap.forEach((d) => loadedLogs.push(d.data() as AlertLog));
          alertLogs = loadedLogs;
        }
      } catch {
        // Keep local alert logs if remote query fails
      }

      saveDataLocal();
      return;
    } else if (monitors.length > 0) {
      // Seed Firestore with local data
      console.log('Gravando monitores locais no Firestore pela primeira vez...');
      for (const m of monitors) {
        await saveMonitorToFirestore(m);
      }
      return;
    }
  } catch (firestoreErr) {
    console.warn('Aviso: Não foi possível conectar ao Firestore no momento. Usando cache local:', firestoreErr);
  }

  // Pre-seed sample monitor so user has an immediate working example if both are empty
  if (monitors.length === 0) {
    const defaultMonitor: ApiMonitor = {
      id: 'mon-default-1',
      name: 'API JSONPlaceholder (Exemplo)',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET',
      intervalValue: 30,
      intervalUnit: 'seconds',
      intervalMs: 30000,
      expectedStatus: 200,
      timeoutMs: 5000,
      chatWebhookKey: '',
      alertOnFailure: true,
      alertOnRecovery: true,
      active: true,
      status: 'pending',
      totalChecks: 0,
      successfulChecks: 0,
      uptimePercent: 100,
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
    };

    monitors = [defaultMonitor];
    checkHistory[defaultMonitor.id] = [];
    alertLogs = [];
    saveDataLocal();
    saveMonitorToFirestore(defaultMonitor).catch(() => {});
  }
}

function saveDataLocal() {
  try {
    const dataToSave = {
      monitors,
      checkHistory,
      alertLogs: alertLogs.slice(0, 100), // Keep last 100 alert logs
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar dados locais:', err);
  }
}

function saveData() {
  saveDataLocal();
}

async function runCheck(monitorId: string): Promise<CheckHistoryEntry | null> {
  const monitor = monitors.find((m) => m.id === monitorId);
  if (!monitor || !monitor.active) return null;

  const prevStatus = monitor.status;
  const startTime = performance.now();
  let status: 'success' | 'failure' = 'failure';
  let statusCode: number | undefined;
  let errorMessage: string | undefined;
  let latencyMs = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), monitor.timeoutMs || 5000);

    const headers: Record<string, string> = {
      'User-Agent': 'ApiMonitor/1.0',
      ...(monitor.headers || {}),
    };

    const fetchOptions: RequestInit = {
      method: monitor.method || 'GET',
      headers,
      signal: controller.signal,
    };

    if (monitor.body && ['POST', 'PUT'].includes(monitor.method)) {
      fetchOptions.body = monitor.body;
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const res = await fetch(monitor.url, fetchOptions);
    clearTimeout(timeout);

    latencyMs = Math.round(performance.now() - startTime);
    statusCode = res.status;

    const expected = monitor.expectedStatus || 200;
    if (statusCode === expected || (expected === 200 && res.ok)) {
      status = 'success';
    } else {
      status = 'failure';
      errorMessage = `Status retornado: ${statusCode} (Esperado: ${expected})`;
    }
  } catch (err: any) {
    latencyMs = Math.round(performance.now() - startTime);
    status = 'failure';
    if (err.name === 'AbortError') {
      errorMessage = `Timeout: requisição excedeu ${monitor.timeoutMs || 5000}ms`;
    } else if (err.code === 'ENOTFOUND') {
      errorMessage = 'DNS Erro: Host não encontrado';
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Conexão recusada pelo servidor de destino';
    } else {
      errorMessage = err.message || 'Falha de conexão com a API';
    }
  }

  // Update monitor metrics
  monitor.lastCheckedAt = new Date().toISOString();
  monitor.lastLatencyMs = latencyMs;
  monitor.lastStatusCode = statusCode;
  monitor.lastErrorMessage = errorMessage;
  monitor.totalChecks += 1;

  if (status === 'success') {
    monitor.successfulChecks += 1;
    monitor.consecutiveFailures = 0;
    monitor.status = 'healthy';
  } else {
    monitor.consecutiveFailures += 1;
    monitor.status = 'unhealthy';
  }

  monitor.uptimePercent = Math.round((monitor.successfulChecks / monitor.totalChecks) * 100);

  // Check history
  const historyEntry: CheckHistoryEntry = {
    id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    monitorId: monitor.id,
    timestamp: monitor.lastCheckedAt,
    status,
    statusCode,
    latencyMs,
    errorMessage,
    alertSent: false,
  };

  if (!checkHistory[monitor.id]) {
    checkHistory[monitor.id] = [];
  }
  checkHistory[monitor.id].unshift(historyEntry);
  if (checkHistory[monitor.id].length > 60) {
    checkHistory[monitor.id] = checkHistory[monitor.id].slice(0, 60);
  }

  // Check if we should trigger an alert
  // Trigger on every check that fails (as requested: send alert on every error)
  const shouldAlertFailure =
    status === 'failure' &&
    monitor.alertOnFailure &&
    Boolean(monitor.chatWebhookKey);

  const shouldAlertRecovery =
    status === 'success' &&
    monitor.alertOnRecovery &&
    Boolean(monitor.chatWebhookKey) &&
    prevStatus === 'unhealthy';

  if (shouldAlertFailure) {
    historyEntry.alertSent = true;
    monitor.lastAlertSentAt = new Date().toISOString();

    const failureCountText = monitor.consecutiveFailures > 1
      ? ` (Falha #${monitor.consecutiveFailures})`
      : '';
    const alertTitle = `Falha na Verificação: ${monitor.name}${failureCountText}`;

    sendGoogleChatAlert(monitor.chatWebhookKey, alertTitle, {
      monitorName: `${monitor.name}${failureCountText}`,
      url: monitor.url,
      type: 'failure',
      statusText: statusCode ? `HTTP ${statusCode}${failureCountText}` : `Inacessível / Timeout${failureCountText}`,
      latencyMs,
      error: errorMessage,
    }).then((res) => {
      const log: AlertLog = {
        id: `alt-${Date.now()}`,
        monitorId: monitor.id,
        monitorName: monitor.name,
        timestamp: new Date().toISOString(),
        type: 'failure',
        message: `Alerta de falha${failureCountText} enviado para Google Chat / Meet. Status: ${statusCode || 'Timeout'}`,
        destination: monitor.chatWebhookKey.substring(0, 45) + '...',
        success: res.success,
        httpStatus: res.status,
        errorDetails: res.error,
      };
      alertLogs.unshift(log);
      saveData();
    });
  } else if (shouldAlertRecovery) {
    historyEntry.alertSent = true;
    monitor.lastAlertSentAt = new Date().toISOString();

    sendGoogleChatAlert(monitor.chatWebhookKey, `API Restabelecida: ${monitor.name}`, {
      monitorName: monitor.name,
      url: monitor.url,
      type: 'recovery',
      statusText: `HTTP ${statusCode} (OK)`,
      latencyMs,
    }).then((res) => {
      const log: AlertLog = {
        id: `alt-${Date.now()}`,
        monitorId: monitor.id,
        monitorName: monitor.name,
        timestamp: new Date().toISOString(),
        type: 'recovery',
        message: `Alerta de recuperação enviado com sucesso.`,
        destination: monitor.chatWebhookKey.substring(0, 45) + '...',
        success: res.success,
        httpStatus: res.status,
        errorDetails: res.error,
      };
      alertLogs.unshift(log);
      saveData();
    });
  }

  saveData();
  return historyEntry;
}

function startTimer(monitor: ApiMonitor) {
  stopTimer(monitor.id);
  if (!monitor.active) return;

  const intervalMs = monitor.intervalMs || calculateIntervalMs(monitor.intervalValue, monitor.intervalUnit);
  console.log(`Iniciando agendador para '${monitor.name}' a cada ${intervalMs}ms`);

  // Execute initial check after short delay
  setTimeout(() => {
    runCheck(monitor.id).catch(console.error);
  }, 1000);

  const timer = setInterval(() => {
    runCheck(monitor.id).catch(console.error);
  }, intervalMs);

  activeTimers.set(monitor.id, timer);
}

function stopTimer(monitorId: string) {
  const existing = activeTimers.get(monitorId);
  if (existing) {
    clearInterval(existing);
    activeTimers.delete(monitorId);
  }
}

function restartAllTimers() {
  for (const timer of activeTimers.values()) {
    clearInterval(timer);
  }
  activeTimers.clear();

  for (const monitor of monitors) {
    if (monitor.active) {
      startTimer(monitor);
    }
  }
}

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), monitorsCount: monitors.length });
});

app.get('/api/monitors', (req, res) => {
  res.json({ monitors });
});

app.post('/api/monitors', (req, res) => {
  const input: CreateMonitorInput = req.body;
  if (!input.url || !input.url.trim()) {
    res.status(400).json({ error: 'URL é obrigatória.' });
    return;
  }

  let formattedUrl = input.url.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }

  const intervalValue = Math.max(1, Number(input.intervalValue) || 30);
  const intervalUnit: IntervalUnit = ['seconds', 'minutes', 'hours'].includes(input.intervalUnit)
    ? input.intervalUnit
    : 'seconds';
  const intervalMs = calculateIntervalMs(intervalValue, intervalUnit);

  const newMonitor: ApiMonitor = {
    id: `mon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: input.name?.trim() || new URL(formattedUrl).hostname,
    url: formattedUrl,
    method: input.method || 'GET',
    intervalValue,
    intervalUnit,
    intervalMs,
    expectedStatus: Number(input.expectedStatus) || 200,
    timeoutMs: Number(input.timeoutMs) || 5000,
    chatWebhookKey: input.chatWebhookKey?.trim() || '',
    headers: input.headers,
    body: input.body,
    alertOnFailure: input.alertOnFailure !== false,
    alertOnRecovery: input.alertOnRecovery !== false,
    active: true,
    status: 'pending',
    totalChecks: 0,
    successfulChecks: 0,
    uptimePercent: 100,
    consecutiveFailures: 0,
    createdAt: new Date().toISOString(),
  };

  monitors.push(newMonitor);
  checkHistory[newMonitor.id] = [];
  saveData();
  saveMonitorToFirestore(newMonitor).catch(() => {});
  startTimer(newMonitor);

  res.status(201).json({ monitor: newMonitor });
});

app.put('/api/monitors/:id', async (req, res) => {
  const { id } = req.params;
  const index = monitors.findIndex((m) => m.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Monitor não encontrado.' });
    return;
  }

  const input: Partial<CreateMonitorInput> & { active?: boolean } = req.body;
  const monitor = monitors[index];

  if (input.url) {
    let formattedUrl = input.url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    monitor.url = formattedUrl;
  }

  if (input.name !== undefined) monitor.name = input.name.trim() || monitor.name;
  if (input.method) monitor.method = input.method;
  if (input.expectedStatus !== undefined) monitor.expectedStatus = Number(input.expectedStatus) || 200;
  if (input.timeoutMs !== undefined) monitor.timeoutMs = Number(input.timeoutMs) || 5000;
  if (input.chatWebhookKey !== undefined) monitor.chatWebhookKey = input.chatWebhookKey.trim();

  if ('headers' in req.body) {
    if (!input.headers || typeof input.headers !== 'object' || Object.keys(input.headers).length === 0) {
      delete monitor.headers;
    } else {
      monitor.headers = input.headers;
    }
  }

  if ('body' in req.body) {
    if (!input.body || typeof input.body !== 'string' || !input.body.trim()) {
      delete monitor.body;
    } else {
      monitor.body = input.body.trim();
    }
  }

  if (input.alertOnFailure !== undefined) monitor.alertOnFailure = input.alertOnFailure;
  if (input.alertOnRecovery !== undefined) monitor.alertOnRecovery = input.alertOnRecovery;
  if (input.active !== undefined) monitor.active = input.active;

  if (input.intervalValue !== undefined || input.intervalUnit !== undefined) {
    monitor.intervalValue = input.intervalValue ?? monitor.intervalValue;
    monitor.intervalUnit = input.intervalUnit ?? monitor.intervalUnit;
    monitor.intervalMs = calculateIntervalMs(monitor.intervalValue, monitor.intervalUnit);
  }

  saveData();
  saveMonitorToFirestore(monitor).catch(() => {});
  if (monitor.active) {
    startTimer(monitor);
  } else {
    stopTimer(monitor.id);
    monitor.status = 'paused';
  }

  res.json({ monitor });
});

app.delete('/api/monitors/:id', async (req, res) => {
  const { id } = req.params;
  stopTimer(id);
  monitors = monitors.filter((m) => m.id !== id);
  delete checkHistory[id];
  saveData();
  deleteMonitorFromFirestore(id).catch(() => {});
  res.json({ success: true });
});

app.post('/api/monitors/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const monitor = monitors.find((m) => m.id === id);
  if (!monitor) {
    res.status(404).json({ error: 'Monitor não encontrado.' });
    return;
  }

  monitor.active = !monitor.active;
  if (monitor.active) {
    monitor.status = 'pending';
    startTimer(monitor);
  } else {
    stopTimer(monitor.id);
    monitor.status = 'paused';
  }

  saveData();
  saveMonitorToFirestore(monitor).catch(() => {});
  res.json({ monitor });
});

app.post('/api/monitors/:id/check', async (req, res) => {
  const { id } = req.params;
  const monitor = monitors.find((m) => m.id === id);
  if (!monitor) {
    res.status(404).json({ error: 'Monitor não encontrado.' });
    return;
  }

  const result = await runCheck(monitor.id);
  res.json({ result, monitor });
});

app.get('/api/monitors/:id/history', (req, res) => {
  const { id } = req.params;
  res.json({ history: checkHistory[id] || [] });
});

app.get('/api/alerts', (req, res) => {
  res.json({ alerts: alertLogs });
});

app.post('/api/test-webhook', async (req, res) => {
  const { webhookKey, monitorName, url } = req.body;
  if (!webhookKey || !webhookKey.trim()) {
    res.status(400).json({ error: 'Chave ou URL do webhook é obrigatória para o teste.' });
    return;
  }

  const result = await sendGoogleChatAlert(
    webhookKey.trim(),
    `Teste de Conexão: ${monitorName || 'Monitor de APIs'}`,
    {
      monitorName: monitorName || 'API de Teste',
      url: url || 'https://meu-servico.com.br/api/health',
      type: 'test',
      statusText: '200 OK (Mensagem de Teste)',
      latencyMs: 84,
    }
  );

  const log: AlertLog = {
    id: `alt-${Date.now()}`,
    monitorId: 'test',
    monitorName: monitorName || 'Teste Manual',
    timestamp: new Date().toISOString(),
    type: 'test',
    message: result.success
      ? 'Mensagem de teste enviada com sucesso para o chat no Google Meet / Chat!'
      : `Falha no teste: ${result.error}`,
    destination: webhookKey.trim().substring(0, 45) + '...',
    success: result.success,
    httpStatus: result.status,
    errorDetails: result.error,
  };
  alertLogs.unshift(log);
  saveData();

  if (result.success) {
    res.json({ success: true, message: 'Alerta de teste enviado com sucesso para o chat!' });
  } else {
    res.status(400).json({
      success: false,
      error: result.error || 'Não foi possível enviar a mensagem para o webhook informado.',
    });
  }
});

// Database status endpoint
app.get('/api/database-status', (req, res) => {
  res.json({
    connected: true,
    provider: 'Firebase Firestore',
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    monitorsCount: monitors.length,
    activeMonitorsCount: monitors.filter((m) => m.active).length,
    updatedAt: new Date().toISOString(),
  });
});

// Export all monitors and logs as JSON
app.get('/api/backup/export', (req, res) => {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    provider: 'Firebase Firestore',
    monitors,
    alertLogs: alertLogs.slice(0, 50),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="api-monitors-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(exportData, null, 2));
});

// Import backup JSON
app.post('/api/backup/import', async (req, res) => {
  try {
    const { monitors: importedMonitors } = req.body;
    if (!Array.isArray(importedMonitors) || importedMonitors.length === 0) {
      res.status(400).json({ error: 'Arquivo de backup inválido ou sem lista de monitores.' });
      return;
    }

    let importedCount = 0;
    for (const item of importedMonitors) {
      if (!item.url) continue;
      const existingIdx = monitors.findIndex((m) => m.id === item.id || m.url === item.url);
      const safeMonitor: ApiMonitor = {
        ...item,
        id: item.id || `mon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        status: item.status || 'pending',
        active: item.active !== false,
        totalChecks: item.totalChecks || 0,
        successfulChecks: item.successfulChecks || 0,
        uptimePercent: item.uptimePercent ?? 100,
        consecutiveFailures: item.consecutiveFailures || 0,
        createdAt: item.createdAt || new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        monitors[existingIdx] = safeMonitor;
      } else {
        monitors.push(safeMonitor);
      }
      importedCount++;
      await saveMonitorToFirestore(safeMonitor);
    }

    saveData();
    restartAllTimers();
    res.json({ success: true, count: importedCount, monitors });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao importar backup: ' + (err.message || 'Erro desconhecido') });
  }
});

// Vite / Static Assets setup
async function startServer() {
  await loadData();
  restartAllTimers();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Monitor de APIs rodando em http://localhost:${PORT}`);
  });
}

startServer();
