/**
 * Встроенная база CRMFish — обычный JSON-файл в папке проекта:
 *     data/crmfish.json
 *
 * • Запись атомарная (сначала во временный файл, потом переименование),
 *   поэтому файл не испортится, даже если выключить компьютер во время сохранения.
 * • При каждом запуске делается копия: data/crmfish.backup.json.
 * • Файл можно скопировать, чтобы перенести базу на другой компьютер.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = process.env.CRMFISH_DATA_DIR ? resolve(process.env.CRMFISH_DATA_DIR) : join(ROOT, 'data');
export const DB_FILE = join(DATA_DIR, 'crmfish.json');
const BACKUP_FILE = join(DATA_DIR, 'crmfish.backup.json');

const DEFAULT_SETTINGS = { startCapital: 100000, rate: 11.5 };

/** @typedef {{ products: any[], settings: { startCapital: number, rate: number }, version: number }} DbState */

/** @returns {DbState} */
function load() {
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) {
    return { products: [], settings: { ...DEFAULT_SETTINGS }, version: 1 };
  }
  const raw = JSON.parse(readFileSync(DB_FILE, 'utf8'));
  copyFileSync(DB_FILE, BACKUP_FILE);
  return {
    products: Array.isArray(raw.products) ? raw.products : [],
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    version: Number(raw.version) || 1,
  };
}

let state = load();

function save() {
  state.version += 1;
  const tmp = `${DB_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify({ ...state, savedAt: new Date().toISOString() }, null, 2));
  renameSync(tmp, DB_FILE);
}

/* ---------- проверка входных данных ---------- */

const num = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const str = (v, max = 2000) => String(v ?? '').slice(0, max);
const iso = (v) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

function cleanProduct(p, id) {
  return {
    id,
    url: str(p.url),
    title: str(p.title, 500),
    priceCny: num(p.priceCny),
    deliveryRub: num(p.deliveryRub),
    isOriginal: !!p.isOriginal,
    isOrdered: !!p.isOrdered || !!p.isSold,
    salePriceRub: num(p.salePriceRub),
    isSold: !!p.isSold,
    createdAt: iso(p.createdAt) ?? new Date().toISOString(),
    orderedAt: iso(p.orderedAt),
    soldAt: iso(p.soldAt),
  };
}

/* ---------- операции ---------- */

export const db = {
  get: () => state,

  addProduct(p) {
    const id = typeof p.id === 'string' && p.id ? p.id : randomUUID();
    if (state.products.some((x) => x.id === id)) return null;
    const item = cleanProduct(p, id);
    state.products.unshift(item);
    save();
    return item;
  },

  updateProduct(id, p) {
    const i = state.products.findIndex((x) => x.id === id);
    if (i < 0) return null;
    state.products[i] = cleanProduct({ ...state.products[i], ...p }, id);
    save();
    return state.products[i];
  },

  deleteProduct(id) {
    const before = state.products.length;
    state.products = state.products.filter((x) => x.id !== id);
    if (state.products.length === before) return false;
    save();
    return true;
  },

  saveSettings(s) {
    state.settings = {
      startCapital: num(s.startCapital, state.settings.startCapital),
      rate: num(s.rate, state.settings.rate),
    };
    save();
    return state.settings;
  },

  /** Полная замена данных (импорт) */
  replaceAll(products, settings) {
    state.products = products.map((p) => cleanProduct(p, typeof p.id === 'string' && p.id ? p.id : randomUUID()));
    if (settings) state.settings = { ...state.settings, ...settings };
    save();
  },
};
