# Карта проекта «Приоритет»

## Маршруты

- Экран, воронка по «Статус», фильтры в URL, локальные заметки, OAuth и синхронизация: [ui.md](ui.md) → `src/App.jsx`, `src/components/`, `src/styles.css`.
- Формат лидов, координаты ячеек и правила записи: [integration.md](integration.md) → `src/data.js`, `src/googleSheet.js`.
- Сборка для локального запуска: `package.json`, `vite.config.mjs`, `start-crm.cmd`.
- Сборка для Vercel: `vercel.json`, `.vercelignore`, `package.json` (`build:vercel`).
- Проверки: `tests/data.test.mjs`, `tests/googleSheet.test.mjs`, `design-qa.md`.

## Зависимости и ограничения

React 19 и Vite 6. Google Sheets API вызывается браузером с короткоживущим OAuth-токеном; серверные секреты не используются. Нужны OAuth Client ID, разрешённый origin сайта и Google-аккаунт с правом редактирования листа «Лиды». Клиентская сборка не содержит снимок лидов. Заметки хранятся в localStorage отдельно для каждого origin.

Локальный `src/snapshot.json` содержит копию лидов и исключён из Git и Vercel; проверки используют синтетические данные.

## Актуальность

`state.json` содержит SHA-256 затронутых исходников и настроек. При новой задаче сравнивайте их и ищите новые файлы, исключая `node_modules`, `dist` и кэши; совпадение хеша не заменяет смысловую проверку.
