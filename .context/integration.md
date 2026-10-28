# Интеграция с Google Таблицей

`src/data.js` задаёт spreadsheet ID, gid и имя листа «Лиды», парсит строку заголовков и сопоставляет `№` с номером текущей строки. `src/googleSheet.js` строит A1-адреса изменённых ячеек и отвергает перемещённую строку, чужую правку и формулу. `src/App.jsx` выполняет два GET перед POST `values:batchUpdate` с `RAW`, затем повторный GET. Это проверка перед записью, а не атомарная блокировка от гонки между проверкой и POST.

Нельзя отправлять файл `src/snapshot.json` на Vercel или импортировать его в клиентскую сборку. Проверять `npm run build:vercel`, `node --test tests/data.test.mjs tests/googleSheet.test.mjs`, отсутствие имени из снимка в `dist/client` и браузерный поток с мокированным Google API. Реальный OAuth и запись требуют настроенного Client ID.
