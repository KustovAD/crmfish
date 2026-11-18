/**
 * Vercel Routing Middleware — пароль на весь сайт (просмотр и изменение).
 *
 * Пароль НЕ хранится в коде (репозиторий может быть публичным).
 * Задайте его в Vercel: Project → Settings → Environment Variables:
 *     APP_PASSWORD = ваш_пароль
 * и сделайте Redeploy.
 *
 * Пока пароль не проверен, сервер не отдаёт ни страницу, ни JS-бандл,
 * поэтому ключ Supabase внутри бандла тоже недоступен посторонним.
 * Локально (npm run dev) защита не действует.
 */

export const config = {
  matcher: '/:path*',
};

const COOKIE = 'crmfish_auth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

/** Продолжить обработку запроса (аналог next() из @vercel/functions) */
const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Токен в cookie зависит от пароля: сменили пароль — все старые входы сбросились */
const tokenFor = (password: string) => sha256(`crmfish:v1:${password}`);

function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** Сравнение без утечки по времени */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function loginPage(error = '', status = 401): Response {
  const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>CRMFish · вход</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;
font-family:Inter,system-ui,sans-serif;color:#e2e8f0;background:#020617}
form{width:100%;max-width:340px;padding:28px;border:1px solid #1e293b;border-radius:18px;background:rgba(15,23,42,.7)}
h1{margin:0 0 4px;font-size:22px}h1 span{color:#facc15}p{margin:0 0 20px;color:#94a3b8;font-size:13px}
input{width:100%;padding:11px 12px;border-radius:12px;border:1px solid #334155;background:#020617;color:#f1f5f9;font-size:15px;outline:none}
input:focus{border-color:#eab308;box-shadow:0 0 0 3px rgba(234,179,8,.25)}
button{width:100%;margin-top:12px;padding:11px;border:0;border-radius:12px;background:#eab308;color:#020617;font-weight:600;font-size:15px;cursor:pointer}
button:hover{background:#facc15}.err{margin:10px 0 0;color:#fb7185;font-size:13px}
</style></head><body>
<form method="POST" action="/__login">
<h1>CRM<span>Fish</span></h1><p>Введите пароль для доступа</p>
<input type="password" name="password" placeholder="Пароль" autofocus required autocomplete="current-password">
${error ? `<div class="err">${error}</div>` : ''}
<button type="submit">Войти</button>
</form></body></html>`;
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const password = process.env.APP_PASSWORD;

  if (!password) {
    return new Response(
      'CRMFish: пароль не настроен. Добавьте переменную APP_PASSWORD в Vercel → Settings → Environment Variables и сделайте Redeploy.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const expected = await tokenFor(password);

  // Выход
  if (url.pathname === '/__logout') {
    return new Response(null, {
      status: 303,
      headers: {
        location: '/',
        'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  // Отправка формы входа
  if (url.pathname === '/__login' && req.method === 'POST') {
    const form = await req.formData();
    const given = String(form.get('password') ?? '');
    if (!safeEqual(await tokenFor(given), expected)) {
      await new Promise((r) => setTimeout(r, 600)); // притормаживаем перебор
      return loginPage('Неверный пароль');
    }
    return new Response(null, {
      status: 303,
      headers: {
        location: '/',
        'set-cookie': `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  const cookie = getCookie(req, COOKIE);
  if (cookie && safeEqual(cookie, expected)) return next();

  return loginPage();
}
