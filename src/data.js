export const SHEET_ID = "1RLtgu9TSvk9tQRVE-OhaWzX4Pgj19OH0z36htA8JxiI";
export const SHEET_GID = "29515803";
export const SHEET_NAME = "Лиды";
export const CACHE_KEY = "lead-crm:sheet-cache:v2";
export const NOTES_KEY = "lead-crm:notes:v1";
export const CLIENT_KEY = "lead-crm:google-client:v1";

export const SHEET_COLUMNS = [
  "№", "Район", "Название", "Ниша", "Этап", "Телефон", "Zalo", "WhatsApp", "Facebook", "Google Maps",
  "Адрес", "Рейтинг", "Отзывов", "Детали", "Ресёрч", "Оффер EN", "Оффер VI", "Заметка", "Дата", "Партия",
  "Fit", "Туристы", "Хук", "Флаги", "Готовность", "Редактура", "Статус", "Интервью: канал",
  "Интервью: деталь", "Интервью VI", "Интервью EN", "Интервью: заметка",
];

export const SEARCH_FIELDS = [
  "Название", "Район", "Ниша", "Этап", "Fit", "Готовность", "Флаги", "Хук", "Телефон",
  "Адрес", "Статус", "Интервью: деталь", "Заметка", "Zalo", "Интервью: канал", "Партия",
];

export const SELECT_FIELDS = ["Статус", "Этап", "Готовность", "Fit", "Туристы", "Интервью: канал"];

export const LONG_FIELDS = [
  "Детали", "Ресёрч", "Оффер EN", "Оффер VI", "Хук", "Заметка",
  "Интервью: деталь", "Интервью VI", "Интервью EN", "Интервью: заметка",
];

export const EDIT_GROUPS = [
  { id: "contacts", title: "Контакты", fields: ["Телефон", "Zalo", "WhatsApp", "Facebook"] },
  { id: "maps", title: "Карточка Maps", fields: ["Название", "Район", "Ниша", "Адрес", "Google Maps", "Рейтинг", "Отзывов", "Детали"] },
  { id: "sales", title: "Продажа", fields: ["Статус", "Этап", "Готовность", "Fit", "Туристы", "Хук", "Флаги"] },
  { id: "texts", title: "Тексты", fields: ["Оффер EN", "Оффер VI", "Интервью: канал", "Интервью: деталь", "Интервью VI", "Интервью EN", "Интервью: заметка", "Ресёрч", "Заметка"] },
  { id: "meta", title: "Служебное", fields: ["Дата", "Партия", "Редактура"] },
];

export const CARD_HEADER_FIELDS = ["№", "Название", "Адрес", "Статус", "Fit", "Туристы", "Готовность", "Район", "Ниша", "Рейтинг", "Отзывов", "Этап"];
export const OVERVIEW_FIELDS = ["Хук", "Интервью: деталь", "Детали", "Флаги", "Партия", "Дата", "Заметка"];
export const INTERVIEW_FIELDS = ["Интервью: канал", "Интервью VI", "Интервью EN", "Интервью: заметка"];
export const OFFER_FIELDS = ["Оффер EN", "Оффер VI", "Редактура"];
export const RESEARCH_FIELDS = ["Ресёрч"];
export const CONTACT_FIELDS = ["Телефон", "Zalo", "WhatsApp", "Google Maps", "Facebook"];

export const SORTS = [
  { id: "fit", label: "Fit" },
  { id: "rating", label: "Рейтинг" },
  { id: "reviews", label: "Отзывов" },
  { id: "date", label: "Дата" },
  { id: "id", label: "№" },
];

const FILTER_PARAMS = [
  ["district", "districts"],
  ["niche", "niches"],
  ["fit", "fits"],
  ["tourists", "tourists"],
  ["batch", "batches"],
  ["channel", "channels"],
  ["readiness", "readiness"],
];

const FIT_RANK = { "высокий": 0, "средний": 1, "низкий": 2 };
const PHONE_RE = /\+84(?:[\s().-]*\d){8,12}|(?:^|[^\d])0(?:[\s().-]*\d){8,11}/;

export function columnCoverage() {
  const shown = new Set([
    ...CARD_HEADER_FIELDS,
    ...OVERVIEW_FIELDS,
    ...INTERVIEW_FIELDS,
    ...OFFER_FIELDS,
    ...RESEARCH_FIELDS,
    ...CONTACT_FIELDS,
    ...EDIT_GROUPS.flatMap(group => group.fields),
  ]);
  const editable = new Set(EDIT_GROUPS.flatMap(group => group.fields));
  return { shown, editable };
}

export function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function bucketFor(value = "") {
  const status = String(value).trim().toLocaleLowerCase("ru");
  if (status.includes("не писать")) return "stop";
  if (status.includes("готов")) return "ready";
  return "check";
}

export function parseStage(raw = "") {
  const text = String(raw ?? "").trim();
  if (!text) return { raw: "", order: 90, kind: "check", label: "без статуса" };
  const numbered = text.match(/^(\d{2})\s+(.*)$/u);
  if (numbered) {
    return { raw: text, order: Number(numbered[1]), kind: "open", label: numbered[2].trim() || text };
  }
  if (text.startsWith("?")) {
    const label = text.replace(/^\?\s*/u, "").trim() || "проверить";
    return { raw: text, order: 90, kind: "check", label };
  }
  if (/^[✕✗×✘]/u.test(text)) {
    const label = text.replace(/^[✕✗×✘]\s*/u, "").trim() || "закрыт";
    return { raw: text, order: 99, kind: "closed", label };
  }
  return { raw: text, order: 90, kind: "check", label: text };
}

export function stageFromReadiness(value = "") {
  const text = String(value ?? "").trim();
  const lower = text.toLocaleLowerCase("ru");
  if (!text) return parseStage("");
  if (lower.includes("не писать")) return { raw: text, order: 99, kind: "closed", label: text };
  if (lower.includes("провер")) return { raw: text, order: 90, kind: "check", label: text };
  if (lower.includes("готов")) return { raw: text, order: 1, kind: "open", label: text };
  return { raw: text, order: 50, kind: "open", label: text };
}

export function normalizePhone(text) {
  const source = String(text ?? "");
  const match = source.match(PHONE_RE);
  if (!match) return null;
  let digits = match[0].replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `84${digits.slice(1)}`;
  if (!digits.startsWith("84") || digits.length < 11 || digits.length > 13) return null;
  return digits;
}

export function buildContacts(fields) {
  const phoneDigits = normalizePhone(fields["Телефон"]);
  const zaloDigits = normalizePhone(fields["Zalo"]);
  const whatsappDigits = normalizePhone(fields["WhatsApp"]) || phoneDigits;
  const rawPhone = String(fields["Телефон"] || "").trim();
  return {
    phone: phoneDigits ? `+${phoneDigits}` : rawPhone,
    telHref: phoneDigits ? `tel:+${phoneDigits}` : (rawPhone ? `tel:${rawPhone.replace(/[^\d+]/g, "")}` : null),
    zaloHref: zaloDigits ? `https://zalo.me/${zaloDigits}` : null,
    zaloText: String(fields["Zalo"] || "").trim(),
    waHref: whatsappDigits ? `https://wa.me/${whatsappDigits}` : null,
    fbHref: safeUrl(fields["Facebook"]),
    mapsHref: safeUrl(fields["Google Maps"]),
  };
}

export function parseFlags(value) {
  return String(value ?? "").split(",").map(item => item.trim()).filter(Boolean);
}

/** @param {any[][]} rows */
export function parseRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) throw new Error("Файл пустой или в нём нет строк с лидами.");
  const headers = rows[0].map(cell => String(cell ?? "").trim());
  for (const name of ["№", "Название", "Район"]) {
    if (!headers.includes(name)) throw new Error(`Не найден столбец «${name}». Нужен экспорт листа «Лиды».`);
  }
  const hasStatus = headers.includes("Статус");
  if (!hasStatus && !headers.includes("Готовность")) {
    throw new Error("Не найден столбец «Статус». Нужен экспорт листа «Лиды».");
  }
  const leads = rows.slice(1).filter(row => row.some(cell => String(cell ?? "").trim())).map((row, index) => {
    /** @type {Record<string, string>} */
    const fields = {};
    headers.forEach((header, column) => {
      if (!header) return;
      fields[header] = String(row[column] ?? "").trim();
    });
    const stage = hasStatus ? parseStage(fields["Статус"]) : stageFromReadiness(fields["Готовность"]);
    return {
      ...fields,
      id: fields["№"] || String(index + 1),
      rowNumber: index + 2,
      bucket: bucketFor(fields["Готовность"]),
      stage,
      contacts: buildContacts(fields),
      flags: parseFlags(fields["Флаги"]),
    };
  });
  const result = /** @type {any} */ (leads);
  result.warning = hasStatus ? "" : "Столбец «Статус» не найден. Воронка построена по столбцу «Готовность».";
  result.statusFallback = !hasStatus;
  return result;
}

export function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
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
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function ratingLine(lead) {
  const rating = String(lead?.["Рейтинг"] || "").trim();
  const reviews = String(lead?.["Отзывов"] || "").trim();
  if (rating && reviews) return `${rating}★ · ${reviews}`;
  if (rating) return `${rating}★`;
  return reviews;
}

export function hasTourists(lead) {
  const value = String(lead?.["Туристы"] || "").trim().toLocaleLowerCase("ru");
  return value === "да" || value === "вероятно";
}

export function isPolished(lead) {
  return String(lead?.["Редактура"] || "").trim().length > 0;
}

export function leadAlert(lead) {
  const note = String(lead?.["Заметка"] || "");
  const flags = String(lead?.["Флаги"] || "");
  const warned = note.includes("⚠");
  const flagged = /не писать/i.test(flags);
  if (warned) return note;
  if (flagged) return flags;
  return "";
}

export function fitClass(value) {
  const key = String(value || "").trim().toLocaleLowerCase("ru");
  if (key === "высокий" || key === "средний" || key === "низкий") return `fit fit-${key}`;
  return "fit fit-нет";
}

export function shortStageLabel(label) {
  const base = String(label || "").split(":")[0].trim();
  if (!base) return "Без статуса";
  return base.charAt(0).toLocaleUpperCase("ru") + base.slice(1);
}

export function stageKey(stage) {
  if (!stage || stage.kind === "closed") return "closed";
  if (stage.kind === "check") return "check";
  return String(stage.order).padStart(2, "0");
}

export function canonicalStageKey(value) {
  const text = String(value || "").trim();
  if (!text || text === "check" || text === "closed") return text;
  if (/^\d{1,2}$/.test(text)) return text.padStart(2, "0");
  return text;
}

export function stageTabs(leads) {
  /** @type {Map<string, { key: string, order: number, kind: string, labels: Map<string, number>, count: number }>} */
  const open = new Map();
  let checkCount = 0;
  let closedCount = 0;
  for (const lead of leads) {
    if (lead.stage.kind === "closed") { closedCount += 1; continue; }
    if (lead.stage.kind === "check") { checkCount += 1; continue; }
    const key = stageKey(lead.stage);
    const current = open.get(key) || { key, order: lead.stage.order, kind: "open", labels: new Map(), count: 0 };
    current.count += 1;
    const label = shortStageLabel(lead.stage.label);
    current.labels.set(label, (current.labels.get(label) || 0) + 1);
    open.set(key, current);
  }
  const tabs = [...open.values()].map(tab => {
    const label = [...tab.labels.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))[0][0];
    return { key: tab.key, order: tab.order, kind: "open", label, count: tab.count };
  }).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ru"));
  tabs.push({ key: "check", order: 90, kind: "check", label: "? Проверить", count: checkCount });
  tabs.push({ key: "closed", order: 99, kind: "closed", label: "✕ Закрытые", count: closedCount });
  return tabs;
}

export function leadInStage(lead, key) {
  if (!key) return lead.stage.kind !== "closed";
  return stageKey(lead.stage) === canonicalStageKey(key);
}

export function stageChoices(leads) {
  const map = new Map();
  for (const lead of leads) {
    if (lead.stage?.raw) map.set(lead.stage.raw, lead.stage);
  }
  for (const extra of ["✕ отказ", "✕ не писать"]) {
    if (!map.has(extra)) map.set(extra, parseStage(extra));
  }
  return [...map.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ru") || a.raw.localeCompare(b.raw, "ru"));
}

export function emptyView() {
  return {
    stage: "",
    districts: [],
    niches: [],
    fits: [],
    tourists: [],
    batches: [],
    channels: [],
    readiness: [],
    sort: "fit",
  };
}

export function viewFromSearch(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const view = emptyView();
  view.stage = canonicalStageKey(params.get("stage") || "");
  const sort = params.get("sort") || "fit";
  view.sort = SORTS.some(item => item.id === sort) ? sort : "fit";
  for (const [param, key] of FILTER_PARAMS) {
    view[key] = params.getAll(param).map(value => value.trim()).filter(Boolean);
  }
  return view;
}

export function searchFromView(view) {
  const params = new URLSearchParams();
  if (view.stage) params.set("stage", view.stage);
  if (view.sort && view.sort !== "fit") params.set("sort", view.sort);
  for (const [param, key] of FILTER_PARAMS) {
    for (const value of view[key] || []) params.append(param, value);
  }
  return params.toString();
}

export function activeFilterCount(view) {
  return FILTER_PARAMS.reduce((sum, [, key]) => sum + (view[key]?.length || 0), 0);
}

export function toggleValue(list, value) {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

function includesOne(selected, value) {
  if (!selected?.length) return true;
  return selected.includes(String(value ?? "").trim());
}

export function matchesFilters(lead, view) {
  return includesOne(view.districts, lead["Район"])
    && includesOne(view.niches, lead["Ниша"])
    && includesOne(view.fits, lead["Fit"])
    && includesOne(view.tourists, lead["Туристы"])
    && includesOne(view.batches, lead["Партия"])
    && includesOne(view.channels, lead["Интервью: канал"])
    && includesOne(view.readiness, lead["Готовность"]);
}

export function matchesQuery(lead, query, noteText = "") {
  const needle = String(query || "").trim().toLocaleLowerCase("ru");
  if (!needle) return true;
  const haystack = SEARCH_FIELDS.map(field => lead[field] || "").join("\n");
  return haystack.toLocaleLowerCase("ru").includes(needle) || String(noteText).toLocaleLowerCase("ru").includes(needle);
}

function numericValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function compareNumericDesc(left, right) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

export function compareLeads(sort, a, b) {
  const idOrder = (Number(a.id) || 0) - (Number(b.id) || 0);
  if (sort === "rating") return compareNumericDesc(numericValue(a["Рейтинг"]), numericValue(b["Рейтинг"])) || idOrder;
  if (sort === "reviews") return compareNumericDesc(numericValue(a["Отзывов"]), numericValue(b["Отзывов"])) || idOrder;
  if (sort === "date") {
    const left = String(a["Дата"] || "");
    const right = String(b["Дата"] || "");
    if (!left && right) return 1;
    if (left && !right) return -1;
    return right.localeCompare(left) || idOrder;
  }
  if (sort === "id") return idOrder;
  const fit = (FIT_RANK[String(a.Fit || "").toLocaleLowerCase("ru")] ?? 3) - (FIT_RANK[String(b.Fit || "").toLocaleLowerCase("ru")] ?? 3);
  return fit || idOrder;
}

/**
 * @param {any[]} leads
 * @param {{ view?: any, query?: string, notes?: Record<string, { text?: string }>, section?: string }} [options]
 */
export function visibleLeads(leads, options = {}) {
  const view = options.view || emptyView();
  const query = options.query || "";
  const notes = options.notes || {};
  const section = options.section || "leads";
  return leads.filter(lead => {
    if (section === "notes" && !String(notes[lead.id]?.text || "").trim()) return false;
    if (!matchesQuery(lead, query, notes[lead.id]?.text || "")) return false;
    return matchesFilters(lead, view);
  }).sort((a, b) => compareLeads(view.sort, a, b));
}

export function optionCounts(leads, field) {
  const counts = new Map();
  for (const lead of leads) {
    const value = String(lead[field] || "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([value, count]) => ({ value, count }));
}

export function uniqueValues(leads, field) {
  return [...new Set(leads.map(lead => String(lead[field] || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ru"));
}

export function editGroupsFor(headers) {
  const known = new Set(EDIT_GROUPS.flatMap(group => group.fields));
  const present = new Set(headers);
  const groups = EDIT_GROUPS.map(group => ({
    ...group,
    fields: group.fields.filter(field => present.has(field)),
  })).filter(group => group.fields.length);
  const extras = headers.filter(field => field && field !== "№" && !known.has(field));
  if (extras.length) groups.push({ id: "extra", title: "Другие поля", fields: extras });
  return groups;
}

export function shareText(lead, tab, language) {
  const other = language === "EN" ? "VI" : "EN";
  const interview = String(lead?.[`Интервью ${language}`] || "").trim();
  const offer = String(lead?.[`Оффер ${language}`] || "").trim();
  const interviewOther = String(lead?.[`Интервью ${other}`] || "").trim();
  const offerOther = String(lead?.[`Оффер ${other}`] || "").trim();
  if (tab === "offer") return offer || offerOther;
  if (tab === "interview") return interview || interviewOther;
  return interview || offer || interviewOther || offerOther;
}

export function whatsappHref(lead, text) {
  if (!lead?.contacts?.waHref) return null;
  const url = new URL(lead.contacts.waHref);
  if (text) url.searchParams.set("text", text);
  return url.href;
}

export function textParts(value) {
  const text = String(value ?? "");
  const parts = [];
  const re = /https?:\/\/[^\s<>"']+/giu;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    let href = match[0];
    let trailing = "";
    while (/[),.;!?]$/.test(href)) {
      trailing = href.slice(-1) + trailing;
      href = href.slice(0, -1);
    }
    parts.push({ type: "link", value: href, href: safeUrl(href) });
    if (trailing) parts.push({ type: "text", value: trailing });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

export function defaultStageKey(leads) {
  const tabs = stageTabs(leads);
  const first = tabs.find(tab => tab.kind === "open" && tab.count)
    || tabs.find(tab => tab.kind !== "closed" && tab.count)
    || tabs.find(tab => tab.kind !== "closed")
    || tabs[0];
  return first?.key || "";
}

export function patchLeadCells(rows, lead, changes) {
  const headers = rows[0].map(cell => String(cell ?? "").trim());
  const next = rows.map(row => row.slice());
  const target = next[lead.rowNumber - 1];
  if (!target) return next;
  for (const [field, value] of Object.entries(changes)) {
    const index = headers.indexOf(field);
    if (index < 0) continue;
    while (target.length <= index) target.push("");
    target[index] = value;
  }
  return next;
}
