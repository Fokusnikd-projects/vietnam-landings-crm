export const SHEET_ID = "1RLtgu9TSvk9tQRVE-OhaWzX4Pgj19OH0z36htA8JxiI";
export const SHEET_GID = "29515803";
export const SHEET_NAME = "Лиды";
export const CACHE_KEY = "lead-crm:sheet-cache:v1";
export const NOTES_KEY = "lead-crm:notes:v1";
export const CLIENT_KEY = "lead-crm:google-client:v1";
export const GROUPS = [
  { id: "ready", title: "Готовы к контакту" },
  { id: "check", title: "Проверить" },
  { id: "stop", title: "Не писать" },
];

export function readStored(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function bucketFor(value = "") {
  const status = String(value).trim().toLowerCase();
  if (status.includes("не писать")) return "stop";
  if (status.includes("готов")) return "ready";
  return "check";
}

export function parseRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) throw new Error("Файл пустой или в нём нет строк с лидами.");
  const headers = rows[0].map(cell => String(cell ?? "").trim());
  for (const name of ["№", "Название", "Район", "Готовность"]) {
    if (!headers.includes(name)) throw new Error(`Не найден столбец «${name}». Нужен экспорт листа «Лиды».`);
  }
  return rows.slice(1).filter(row => row.some(cell => String(cell ?? "").trim())).map((row, index) => {
    const fields = Object.fromEntries(headers.map((header, column) => [header, String(row[column] ?? "").trim()]));
    return { ...fields, id: fields["№"] || String(index + 1), rowNumber: index + 2, bucket: bucketFor(fields["Готовность"]) };
  });
}

export function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("CSV повреждён: не закрыта кавычка.");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function readableDate(value) {
  if (!value) return "нет данных";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, Number(day)));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

export function safeUrl(value) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
