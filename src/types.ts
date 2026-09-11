export type IntervalUnit = 'seconds' | 'minutes' | 'hours';
export type HttpMethod = 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE';
export type MonitorStatus = 'healthy' | 'unhealthy' | 'checking' | 'paused' | 'pending';

export interface ApiMonitor {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  intervalMs: number;
  expectedStatus: number;
  timeoutMs: number;
  chatWebhookKey: string; // Webhook URL or key/token for Google Chat / Meet
  headers?: Record<string, string>;
  body?: string;
  alertOnFailure: boolean;
  alertOnRecovery: boolean;
  active: boolean;
  
  // Status & Metrics
  status: MonitorStatus;
  lastCheckedAt?: string;
  lastLatencyMs?: number;
  lastStatusCode?: number;
  lastErrorMessage?: string;
  lastAlertSentAt?: string;
  totalChecks: number;
  successfulChecks: number;
  uptimePercent: number;
  consecutiveFailures: number;
  createdAt: string;
}

export interface CheckHistoryEntry {
  id: string;
  monitorId: string;
  timestamp: string;
  status: 'success' | 'failure';
  statusCode?: number;
  latencyMs: number;
  errorMessage?: string;
  alertSent?: boolean;
}

export interface AlertLog {
  id: string;
  monitorId: string;
  monitorName: string;
  timestamp: string;
  type: 'failure' | 'recovery' | 'test';
  message: string;
  destination: string;
  success: boolean;
  httpStatus?: number;
  errorDetails?: string;
}

export interface CreateMonitorInput {
  name: string;
  url: string;
  method?: HttpMethod;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  expectedStatus?: number;
  timeoutMs?: number;
  chatWebhookKey: string;
  headers?: Record<string, string> | null;
  body?: string | null;
  alertOnFailure?: boolean;
  alertOnRecovery?: boolean;
}
