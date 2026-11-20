/**
 * ============================================================================
 * SRC/CONFIG/DATABASE.TS — Simple Auto-Detect Database Configuration (.env)
 * Set only VITE_DATABASE_URL in .env:
 *  - Empty -> Local Browser Database (auto)
 *  - https://script.google.com/... -> Google Sheets via Apps Script (auto)
 *  - https://... -> External REST API (auto)
 * ============================================================================
 */

export type DatabaseMode = 'local' | 'gas' | 'api';

export interface DatabaseConfig {
  mode: DatabaseMode;
  databaseUrl: string;
  wokwiApiUrl: string;
  gasWebAppUrl: string;
  apiBaseUrl: string;
  localStorageKey: string;
}

const rawUrl = (
  import.meta.env.VITE_DATABASE_URL ||
  import.meta.env.VITE_GAS_WEBAPP_URL ||
  ''
).trim();

const rawWokwiUrl = (import.meta.env.VITE_WOKWI_API_URL || '').trim();

function detectMode(url: string): DatabaseMode {
  if (url.startsWith('https://script.google.com/')) {
    return 'gas';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'api';
  }
  return 'local';
}

const detectedMode = detectMode(rawUrl);

export const databaseConfig: DatabaseConfig = {
  mode: detectedMode,
  databaseUrl: rawUrl,
  wokwiApiUrl: rawWokwiUrl,
  gasWebAppUrl: detectedMode === 'gas' ? rawUrl : '',
  apiBaseUrl: detectedMode === 'api' ? rawUrl : '',
  localStorageKey: 'SRRU_SMART_LIB_LOCAL_SHEETS_V1'
};

export function getActiveGasWebAppUrl(): string {
  if (databaseConfig.gasWebAppUrl) {
    return databaseConfig.gasWebAppUrl;
  }
  if (typeof localStorage !== 'undefined') {
    return (localStorage.getItem('SRRU_GAS_WEBAPP_URL') || '').trim();
  }
  return '';
}
