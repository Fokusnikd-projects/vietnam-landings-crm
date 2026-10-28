import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseRows } from "../src/data.js";

test("lead readiness maps to the three board groups", () => {
  const leads = parseRows([
    ["№", "Название", "Район", "Готовность"],
    ["1", "Спа А", "Центр", "готов к отправке"],
    ["2", "Спа Б", "Центр", "проверить"],
    ["3", "Спа В", "Центр", "не писать"],
  ]);
  assert.equal(leads.length, 3);
  assert.equal(new Set(leads.map(lead => lead.id)).size, leads.length);
  assert.deepEqual(Object.fromEntries(["ready","check","stop"].map(bucket => [bucket, leads.filter(lead => lead.bucket === bucket).length])), { ready:1, check:1, stop:1 });
});

test("CSV parser preserves quoted commas, quotes, and multiline research", () => {
  const csv = '№,Название,Район,Готовность,Ресёрч\r\n1,"Spa, A",Phú Nhuận,готов к отправке,"Первая строка\nВторая ""цитата"""\r\n';
  const leads = parseRows(parseCsv(csv));
  assert.equal(leads[0]["Название"], "Spa, A");
  assert.equal(leads[0]["Ресёрч"], 'Первая строка\nВторая "цитата"');
  assert.equal(leads[0].bucket, "ready");
});

test("CSV import rejects a sheet without required columns", () => {
  assert.throws(() => parseRows(parseCsv("A,B\n1,2")), /Не найден столбец/);
});
