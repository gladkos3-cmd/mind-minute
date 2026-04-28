# Mind Minute — Telegram Mini App (MVP)

Мини‑приложение для **микромедитаций 30–180 секунд** “в моменте”: стресс → практика → отметка эффекта → streak.

## Запуск локально

1) Установи Node.js LTS (если ещё нет).
2) В корне проекта:

```bash
npm install
npm run dev
```

Откроется Vite dev server (обычно `http://localhost:5173`).

## Запуск внутри Telegram

Дальше добавим:

- хостинг (Vercel/Cloudflare Pages),
- Bot + настройку Web App URL,
- подпись `initData` и минимальный бэкенд для валидации/платежей.

