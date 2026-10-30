import test from "node:test";
import assert from "node:assert/strict";
import {
  SHEET_COLUMNS, columnCoverage, parseCsv, parseRows, parseStage, normalizePhone,
  stageTabs, emptyView, viewFromSearch, searchFromView, visibleLeads, stageChoices,
} from "../src/data.js";

test("lead readiness maps to the three board groups", () => {
  const leads = parseRows([
    ["№", "Название", "Район", "Готовность"],
    ["1", "Спа А", "Центр", "готов к отправке"],
    ["2", "Спа Б", "Центр", "проверить"],
    ["3", "Спа В", "Центр", "не писать"],
  ]);
  assert.equal(leads.length, 3);
  assert.equal(new Set(leads.map(lead => lead.id)).size, leads.length);
  assert.deepEqual(Object.fromEntries(["ready", "check", "stop"].map(bucket => [bucket, leads.filter(lead => lead.bucket === bucket).length])), { ready: 1, check: 1, stop: 1 });
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

test("parseStage reads the live funnel, empty cells, and unseen numbered stages", () => {
  const samples = [
    ["02 ресёрч", { order: 2, kind: "open", label: "ресёрч" }],
    ["03 оффер готов", { order: 3, kind: "open", label: "оффер готов" }],
    ["04 интервью: черновик", { order: 4, kind: "open", label: "интервью: черновик" }],
    ["11 разработка", { order: 11, kind: "open", label: "разработка" }],
    ["? проверить", { order: 90, kind: "check", label: "проверить" }],
    ["✕ есть сайт", { order: 99, kind: "closed", label: "есть сайт" }],
    ["✕ не писать", { order: 99, kind: "closed", label: "не писать" }],
    ["✕ отказ", { order: 99, kind: "closed", label: "отказ" }],
    ["", { order: 90, kind: "check", label: "без статуса", raw: "" }],
    ["05 новый этап", { order: 5, kind: "open", label: "новый этап" }],
  ];
  for (const [raw, expected] of samples) {
    const stage = parseStage(raw);
    assert.equal(stage.order, expected.order, raw);
    assert.equal(stage.kind, expected.kind, raw);
    assert.equal(stage.label, expected.label, raw);
    assert.equal(stage.raw, expected.raw ?? raw);
  }
});

test("normalizePhone pulls the Zalo number out of free text", () => {
  assert.equal(normalizePhone("Zalo likely, same number: +84 889 274 674"), "84889274674");
  assert.equal(normalizePhone("0901 234 567"), "84901234567");
  assert.equal(normalizePhone("нет номера"), null);
});

test("a sheet without Status falls back to readiness and warns", () => {
  const leads = parseRows([
    ["№", "Название", "Район", "Готовность"],
    ["1", "Спа А", "Центр", "готов к отправке"],
    ["2", "Спа Б", "Центр", "не писать"],
  ]);
  assert.equal(leads.statusFallback, true);
  assert.match(leads.warning, /Готовность/);
  assert.equal(leads[0].stage.kind, "open");
  assert.equal(leads[1].stage.kind, "closed");
});

test("status builds contacts, flags, and a tab for a new numbered stage", () => {
  const leads = parseRows([
    ["№", "Название", "Район", "Статус", "Zalo", "Телефон", "Флаги"],
    ["1", "Lan Spa", "Phú Nhuận", "02 ресёрч", "Zalo likely, same number: +84 889 274 674", "+84 889 274 674", "туристы, есть сайт"],
    ["2", "Новый", "Quận 1", "05 новый этап", "", "", ""],
  ]);
  assert.equal(leads.warning, "");
  assert.equal(leads[0].contacts.zaloHref, "https://zalo.me/84889274674");
  assert.equal(leads[0].contacts.phone, "+84889274674");
  assert.deepEqual(leads[0].flags, ["туристы", "есть сайт"]);
  const keys = stageTabs(leads).map(tab => tab.key);
  assert.ok(keys.includes("02"));
  assert.ok(keys.includes("05"));
  assert.deepEqual(keys.slice(-2), ["check", "closed"]);
});

test("Phú Nhuận + massage + high Fit filter and URL round-trip", () => {
  const headers = ["№", "Название", "Район", "Ниша", "Fit", "Статус", "Адрес", "Заметка"];
  const leads = parseRows([
    headers,
    ["1", "Lan", "Phú Nhuận", "massage", "высокий", "04 интервью: черновик", "12 Huỳnh Văn Bánh", "⚠ проверить"],
    ["2", "Mây", "Phú Nhuận", "spa", "высокий", "04 интервью: черновик", "", ""],
    ["3", "Sen", "Phú Nhuận", "massage", "низкий", "02 ресёрч", "", ""],
    ["4", "Đá", "Quận 1", "massage", "высокий", "03 оффер готов", "", ""],
  ]);
  const view = { ...emptyView(), stage: "04", districts: ["Phú Nhuận"], niches: ["massage"], fits: ["высокий"] };
  assert.deepEqual(visibleLeads(leads, { view }).map(lead => lead.id), ["1"]);
  const restored = viewFromSearch(searchFromView(view));
  assert.equal(restored.stage, "04");
  assert.deepEqual(restored.districts, ["Phú Nhuận"]);
  assert.deepEqual(restored.niches, ["massage"]);
  assert.deepEqual(restored.fits, ["высокий"]);
  assert.equal(visibleLeads(leads, { view: emptyView(), query: "Huỳnh" }).length, 1);
  assert.equal(visibleLeads(leads, { view: emptyView(), query: "проверить" })[0].id, "1");
});

test("stage choices keep funnel order and always offer refusal outcomes", () => {
  const leads = parseRows([
    ["№", "Название", "Район", "Статус"],
    ["1", "A", "X", "11 разработка"],
    ["2", "B", "X", "02 ресёрч"],
  ]);
  const raws = stageChoices(leads).map(stage => stage.raw);
  assert.deepEqual(raws, ["02 ресёрч", "11 разработка", "✕ не писать", "✕ отказ"]);
});

test("every sheet column is visible in the card or the edit modal", () => {
  assert.equal(SHEET_COLUMNS.length, 32);
  assert.equal(new Set(SHEET_COLUMNS).size, 32);
  const { shown, editable } = columnCoverage();
  for (const column of SHEET_COLUMNS) assert.equal(shown.has(column), true, column);
  for (const column of SHEET_COLUMNS.filter(column => column !== "№")) assert.equal(editable.has(column), true, column);
});
