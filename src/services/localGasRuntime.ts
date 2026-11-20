/**
 * ============================================================================
 * SRC/SERVICES/LOCALGASRUNTIME.TS — Local Browser GAS V8 Runtime Bridge
 * Executes the actual 13 .gs Backend files inside the browser when running on
 * Vite Dev/Preview server outside Google Apps Script HTML Service.
 * ============================================================================
 */

import { databaseConfig } from '../config/database';
import { RpcRequestEnvelope, RpcResponseEnvelope } from '../types/api';
import { GAS_BACKEND_SOURCE } from './gasBackendSource';

const STORAGE_KEY = databaseConfig.localStorageKey;

/**
 * Pure JavaScript SHA-256 implementation for synchronous Utilities.computeDigest emulation.
 */
function sha256Bytes(inputStr: string): number[] {
  const utf8Str = unescape(encodeURIComponent(String(inputStr)));
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const maxWord = Math.pow(2, 32);
  let i = 0;
  let j = 0;
  const words: number[] = [];
  const asciiBitLength = utf8Str.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let padded = utf8Str + '\x80';
  while ((padded.length % 64) - 56) padded += '\x00';
  for (i = 0; i < padded.length; i++) {
    j = padded.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        (hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0)) |
        0;
      const temp2 =
        ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) |
        0;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.length = 8;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  const outBytes: number[] = [];
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      outBytes.push((hash[i] >> (j * 8)) & 255);
    }
  }
  return outBytes;
}

export function initLocalGasRuntimeIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (window.google?.script?.run || typeof window.__LOCAL_GAS_RPC__ === 'function') {
    return;
  }

  const propertiesStore: Record<string, string> = {
    IOT_API_SECRET: 'SRRU_IOT_SECRET_2026',
    INITIAL_ADMIN_PASSWORD: 'Admin@SRRU2026'
  };
  let sheetsData: Record<string, unknown[][]> = {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      sheetsData = JSON.parse(raw) as Record<string, unknown[][]>;
    }
  } catch {
    sheetsData = {};
  }

  function persistSheets(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheetsData));
    } catch {
      // Ignore storage quota warnings
    }
  }

  function createSheetObj(name: string) {
    if (!sheetsData[name]) {
      sheetsData[name] = [];
    }
    return {
      getName: () => name,
      getLastRow: () => sheetsData[name].length,
      setFrozenRows: () => undefined,
      getRange: (row: number, col: number, numRows = 1, numCols = 1) => ({
        setNumberFormat() {
          return this;
        },
        getValues() {
          const out: unknown[][] = [];
          for (let r = 0; r < numRows; r++) {
            const src = sheetsData[name][row - 1 + r] || [];
            const rowArr: unknown[] = [];
            for (let c = 0; c < numCols; c++) {
              const val = src[col - 1 + c];
              rowArr.push(val !== undefined ? val : '');
            }
            out.push(rowArr);
          }
          return out;
        },
        setValues(matrix: unknown[][]) {
          for (let r = 0; r < numRows; r++) {
            const rIdx = row - 1 + r;
            if (!sheetsData[name][rIdx]) {
              sheetsData[name][rIdx] = [];
            }
            for (let c = 0; c < numCols; c++) {
              sheetsData[name][rIdx][col - 1 + c] = matrix[r][c];
            }
          }
          persistSheets();
          return this;
        }
      })
    };
  }

  const mockSpreadsheet = {
    getSheetByName: (name: string) => (sheetsData[name] ? createSheetObj(name) : null),
    insertSheet: (name: string) => {
      sheetsData[name] = [];
      persistSheets();
      return createSheetObj(name);
    }
  };

  const win = window as unknown as Record<string, unknown>;

  win.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k: string) => propertiesStore[k] || null,
      setProperty: (k: string, v: string) => {
        propertiesStore[k] = String(v);
      }
    })
  };

  const LOCAL_CACHE_KEY = 'SRRU_LOCAL_GAS_CACHE_V1';
  let persistedCache: Record<string, string> = {};
  try {
    const rawCache = localStorage.getItem(LOCAL_CACHE_KEY);
    if (rawCache) {
      persistedCache = JSON.parse(rawCache) as Record<string, string>;
    }
  } catch {
    persistedCache = {};
  }
  const saveLocalCache = (): void => {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(persistedCache));
    } catch {
      // Ignore quota errors
    }
  };

  win.CacheService = {
    getScriptCache: () => ({
      get: (k: string) => persistedCache[k] || null,
      put: (k: string, v: string) => {
        persistedCache[k] = String(v);
        saveLocalCache();
      },
      remove: (k: string) => {
        delete persistedCache[k];
        saveLocalCache();
      }
    })
  };

  win.LockService = {
    getScriptLock: () => ({
      tryLock: () => true,
      releaseLock: () => undefined
    })
  };

  win.SpreadsheetApp = {
    getActiveSpreadsheet: () => mockSpreadsheet,
    openById: () => mockSpreadsheet
  };

  win.Utilities = {
    Charset: { UTF_8: 'utf8' },
    DigestAlgorithm: { SHA_256: 'sha256' },
    getUuid: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
    computeDigest: (_algo: string, value: string) => sha256Bytes(value),
    formatDate: (dateObj: Date) => {
      const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
      const tzOffsetMs = 7 * 60 * 60 * 1000;
      const local = new Date(d.getTime() + tzOffsetMs);
      return local.toISOString().replace(/\.\d{3}Z$/, '+07:00');
    }
  };

  const combinedSource = [
    GAS_BACKEND_SOURCE,
    'window.__gasSetupDatabase = setupDatabase;',
    'window.__gasHandleClientRpc = handleClientRpc;'
  ].join('\n');

  const runner = new Function(combinedSource);
  runner();

  const setupFn = win.__gasSetupDatabase as () => void;
  const rpcFn = win.__gasHandleClientRpc as (
    env: RpcRequestEnvelope<Record<string, unknown>>
  ) => RpcResponseEnvelope<unknown>;

  setupFn();

  window.__LOCAL_GAS_RPC__ = (envelope) =>
    Promise.resolve(rpcFn(envelope));
}
