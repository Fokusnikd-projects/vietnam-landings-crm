import { SHEET_ID, SHEET_NAME } from "./data.js";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
export const REFRESH_INTERVAL_MS = 5000;
export const SHEET_VALUES_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;

export function columnName(index) {
  if (!Number.isInteger(index) || index < 0) throw new Error("Неверный номер столбца.");
  let value = index + 1, name = "";
  while (value > 0) { value -= 1; name = String.fromCharCode(65 + value % 26) + name; value = Math.floor(value / 26); }
  return name;
}

export function rowRange(rowNumber, lastColumn) {
  return `'${SHEET_NAME}'!A${rowNumber}:${columnName(lastColumn)}${rowNumber}`;
}

export function buildWriteRanges({ headers, lead, draft, liveValues, liveFormulas }) {
  if (!Array.isArray(headers) || !lead || !Number.isInteger(lead.rowNumber)) throw new Error("Нет исходной строки лида.");
  if (String(liveValues[headers.indexOf("№")] ?? "").trim() !== String(lead.id)) {
    throw new Error("Строка лида переместилась или изменилась. Обновите таблицу и откройте лида снова.");
  }
  const updates = [];
  for (let index = 0; index < headers.length; index += 1) {
    const field = headers[index];
    if (!field || field === "№") continue;
    const next = String(draft[field] ?? "").trim();
    const original = String(lead[field] ?? "").trim();
    if (next === original) continue;
    if (String(liveFormulas[index] ?? "").startsWith("=")) {
      throw new Error(`Столбец «${field}» содержит формулу. Измените её в Google Таблице.`);
    }
    if (String(liveValues[index] ?? "").trim() !== original) {
      throw new Error(`Поле «${field}» уже изменено в таблице. Обновите данные перед сохранением.`);
    }
    const numeric = ["Рейтинг", "Отзывов"].includes(field) && next !== "" && /^-?\d+(?:[.,]\d+)?$/.test(next)
      ? Number(next.replace(",", ".")) : next;
    updates.push({ range: `'${SHEET_NAME}'!${columnName(index)}${lead.rowNumber}`, values: [[numeric]] });
  }
  return updates;
}
