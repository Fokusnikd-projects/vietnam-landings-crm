import test from "node:test";
import assert from "node:assert/strict";
import { buildWriteRanges, columnName, rowRange, writeCell } from "../src/googleSheet.js";

const headers = ["№", "Название", "Телефон", "Готовность", "Рейтинг"];
const lead = { id:"42", rowNumber:12, Название:"Спа", Телефон:"01234", Готовность:"проверить", Рейтинг:"4,5" };
const liveValues = ["42", "Спа", "01234", "проверить", "4,5"];

test("A1 coordinates work beyond column Z", () => {
  assert.equal(columnName(26), "AA");
  assert.equal(rowRange(12, 26), "'Лиды'!A12:AA12");
});

test("write plan changes only edited cells and preserves phone text", () => {
  const updates = buildWriteRanges({ headers, lead, draft:{ ...lead, Телефон:"00123", Готовность:"готов к отправке", Рейтинг:"4,8" }, liveValues, liveFormulas:liveValues });
  assert.deepEqual(updates, [
    { range:"'Лиды'!C12", values:[["00123"]] },
    { range:"'Лиды'!D12", values:[["готов к отправке"]] },
    { range:"'Лиды'!E12", values:[[4.8]] }
  ]);
});

test("write plan stops on moved rows, concurrent edits, and formulas", () => {
  const draft = { ...lead, Название:"Новое имя" };
  assert.throws(() => buildWriteRanges({ headers, lead, draft, liveValues:["43", ...liveValues.slice(1)], liveFormulas:liveValues }), /переместилась/);
  assert.throws(() => buildWriteRanges({ headers, lead, draft, liveValues:["42", "Чужая правка", ...liveValues.slice(2)], liveFormulas:liveValues }), /уже изменено/);
  assert.throws(() => buildWriteRanges({ headers, lead, draft, liveValues, liveFormulas:["42", "=A1", ...liveValues.slice(2)] }), /формулу/);
});

test("status change writes exactly one Status cell and rejects a conflict", () => {
  const wideHeaders = Array.from({ length: 32 }, (_, index) => `Колонка ${index}`);
  wideHeaders[0] = "№";
  wideHeaders[4] = "Этап";
  wideHeaders[26] = "Статус";
  const statusLead = { id: "7", rowNumber: 8, "№": "7", "Этап": "лид", "Статус": "02 ресёрч" };
  const values = wideHeaders.map((header, index) => {
    if (index === 0) return "7";
    if (index === 4) return "лид";
    if (index === 26) return "02 ресёрч";
    return "";
  });
  const updates = writeCell({ headers: wideHeaders, lead: statusLead, field: "Статус", value: "03 оффер готов", liveValues: values, liveFormulas: values });
  assert.deepEqual(updates, [{ range: "'Лиды'!AA8", values: [["03 оффер готов"]] }]);
  const conflicted = values.map((value, index) => index === 26 ? "04 интервью: черновик" : value);
  assert.throws(() => writeCell({ headers: wideHeaders, lead: statusLead, field: "Статус", value: "03 оффер готов", liveValues: conflicted, liveFormulas: values }), /уже изменено/);
  const withRefusal = buildWriteRanges({
    headers: wideHeaders,
    lead: statusLead,
    draft: { ...statusLead, "Статус": "✕ отказ", "Этап": "отказ" },
    liveValues: values,
    liveFormulas: values,
  });
  assert.deepEqual(withRefusal.map(item => item.range), ["'Лиды'!E8", "'Лиды'!AA8"]);
});
