#!/bin/bash
# Двойной клик в Finder — запускает CRMFish и открывает его в браузере.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Не найден Node.js. Установите его с https://nodejs.org (версия LTS) и запустите ещё раз."
  read -r -p "Нажмите Enter, чтобы закрыть…"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Первый запуск: устанавливаю зависимости…"
  npm install || { read -r -p "Ошибка установки. Нажмите Enter…"; exit 1; }
fi

echo "Собираю приложение…"
npm run build || { read -r -p "Ошибка сборки. Нажмите Enter…"; exit 1; }

(sleep 1.5 && open "http://localhost:${PORT:-5173}") &
node server.mjs
