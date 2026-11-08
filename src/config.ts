/**
 * ================= ПОДКЛЮЧЕНИЕ ОБЩЕЙ БАЗЫ (SUPABASE) =================
 *
 * Вариант 1 (рекомендуется): создайте в корне проекта файл .env.local:
 *     VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
 *     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...
 *
 * Вариант 2: вставьте значения прямо в константы ниже ⬇️
 *   ⚠️ Не делайте так, если репозиторий на GitHub публичный —
 *   используйте переменные окружения в Vercel (см. README).
 *
 * Где взять: supabase.com → ваш проект → кнопка «Connect» вверху
 *   (или Project Settings → API Keys)
 *   • Project URL                          → SUPABASE_URL
 *   • publishable key (sb_publishable_…)   → SUPABASE_ANON_KEY
 *     (старый anon-ключ eyJ… тоже подойдёт)
 *
 * Без этих значений приложение покажет экран настройки подключения.
 * =====================================================================
 */
const SUPABASE_URL_HARDCODED = ''; // ← сюда URL проекта
const SUPABASE_ANON_KEY_HARDCODED = ''; // ← сюда anon public key

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_HARDCODED;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_HARDCODED;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
