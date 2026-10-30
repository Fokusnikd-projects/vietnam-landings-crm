import { useEffect, useMemo, useRef, useState } from "react";
import {
  SHEET_ID, SHEET_GID, NOTES_KEY, CLIENT_KEY, SORTS,
  readStored, parseRows, parseCsv, readableDate, shareText, whatsappHref,
  viewFromSearch, searchFromView, activeFilterCount, visibleLeads, stageTabs,
  defaultStageKey, stageChoices, patchLeadCells, parseStage, stageKey,
} from "./data";
import {
  GOOGLE_SCOPE, REFRESH_INTERVAL_MS, SHEET_VALUES_URL, SHEET_READ_RANGE,
  buildWriteRanges, rowRange, writeCell, isSheetConflict,
} from "./googleSheet";
import { EditModal } from "./components/EditModal.jsx";
import { FilterSheet } from "./components/FilterSheet.jsx";
import { Icon } from "./components/icons.jsx";
import { LeadCard } from "./components/LeadCard.jsx";
import { LeadList } from "./components/LeadList.jsx";
import { StageSheet } from "./components/StageSheet.jsx";

const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}`;

function useWideScreen() {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function googleOauth() {
  return /** @type {any} */ (window).google?.accounts?.oauth2 || null;
}

export function App() {
  const wide = useWideScreen();
  const [source, setSource] = useState({ rows: [], updatedAt: null, kind: "none" });
  const [notes, setNotes] = useState(() => readStored(NOTES_KEY, {}));
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("leads");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");
  const [language, setLanguage] = useState("EN");
  const [detailTab, setDetailTab] = useState("overview");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clientId, setClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem(CLIENT_KEY) || "");
  const [token, setToken] = useState("");
  const [googleReady, setGoogleReady] = useState(Boolean(googleOauth()));
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({});
  const [savingLead, setSavingLead] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [stale, setStale] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState(() => viewFromSearch(window.location.search));
  const fileInput = useRef(null);
  const notesInput = useRef(null);
  const zaloTimer = useRef(0);
  const queueRef = useRef(Promise.resolve());
  const pendingRows = useRef(null);
  const gateRef = useRef({ edit: false, stage: false, saving: false });
  const sourceRef = useRef(source);
  const loadRef = useRef(/** @type {any} */ (null));

  gateRef.current = { edit: editOpen, stage: stageOpen, saving: savingLead || savingStage };
  sourceRef.current = source;

  const leads = useMemo(() => {
    try { return parseRows(source.rows); }
    catch { return []; }
  }, [source]);
  const headers = useMemo(() => (source.rows[0] || []).map(value => String(value ?? "").trim()), [source.rows]);
  const filtered = useMemo(() => visibleLeads(leads, { view, query, notes, section }), [leads, view, query, notes, section]);
  const tabs = useMemo(() => {
    const counts = new Map(stageTabs(filtered).map(tab => [tab.key, tab.count]));
    return stageTabs(leads).map(tab => ({ ...tab, count: counts.get(tab.key) || 0 }));
  }, [leads, filtered]);
  const selected = leads.find(lead => lead.id === selectedId) || null;
  const noteCount = Object.values(notes).filter(note => note.text?.trim()).length;
  const activeStage = view.stage || defaultStageKey(leads);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const filterCount = activeFilterCount(view);
  const sourceLabel = source.kind === "google" ? (token ? "Google Таблица · запись" : "Google · переподключить") : source.kind === "csv" ? "CSV с этого компьютера" : "Google не подключён";
  const sheetWarning = leads.warning || "";

  const applyRows = (rows, kind, { quiet = false } = {}) => {
    const parsed = parseRows(rows);
    setSource({ rows, updatedAt: new Date().toISOString(), kind });
    setSyncError("");
    pendingRows.current = null;
    setStale(false);
    if (!quiet) {
      setSettingsOpen(false);
      setMessage(`Загружено ${parsed.length} лидов.`);
    }
  };

  const performLoad = async (accessToken, { quiet = false, force = false } = {}) => {
    if (!quiet) { setSyncing(true); setError(""); }
    try {
      const rows = await readGoogle(accessToken, SHEET_READ_RANGE);
      const gate = gateRef.current;
      const same = JSON.stringify(rows) === JSON.stringify(sourceRef.current.rows);
      if (!force && gate.saving) return true;
      if (!force && (gate.edit || gate.stage)) {
        if (!same) {
          pendingRows.current = rows;
          setStale(true);
        }
        return true;
      }
      if (!force && same && sourceRef.current.kind === "google") return true;
      applyRows(rows, "google", { quiet });
      return true;
    } catch (loadError) {
      const reason = /** @type {any} */ (loadError);
      if (reason.status === 401) { setToken(""); setSyncError("Сессия Google истекла. Подключите аккаунт снова."); }
      else setSyncError(reason.message || "Не удалось обновить таблицу.");
      if (!quiet) setError(reason.message || "Не удалось обновить таблицу.");
      return false;
    } finally {
      if (!quiet) setSyncing(false);
    }
  };

  const loadGoogle = (accessToken, options) => {
    const run = queueRef.current.then(() => performLoad(accessToken, options));
    queueRef.current = run.then(() => undefined, () => undefined);
    return run;
  };
  loadRef.current = loadGoogle;

  useEffect(() => {
    if (view.stage || !leads.length) return;
    const key = defaultStageKey(leads);
    if (key) setView(current => current.stage ? current : { ...current, stage: key });
  }, [leads, view.stage]);

  useEffect(() => {
    const next = searchFromView(view);
    const current = window.location.search.replace(/^\?/, "");
    if (next === current) return;
    const url = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [view]);

  useEffect(() => {
    const onPop = () => setView(viewFromSearch(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    setDraft(selectedId ? notesRef.current[selectedId]?.text || "" : "");
    setSaveState("");
  }, [selectedId]);
  useEffect(() => {
    if (message || error) {
      const timer = window.setTimeout(() => { setMessage(""); setError(""); }, 7000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [message, error]);
  useEffect(() => () => window.clearTimeout(zaloTimer.current), []);
  useEffect(() => {
    const locked = settingsOpen || editOpen || stageOpen || filterOpen || Boolean(selectedId);
    document.body.classList.toggle("scroll-lock", locked);
    return () => document.body.classList.remove("scroll-lock");
  }, [settingsOpen, editOpen, stageOpen, filterOpen, selectedId]);
  useEffect(() => {
    if (!settingsOpen || googleOauth()) {
      if (googleOauth()) setGoogleReady(true);
      return undefined;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => setGoogleReady(true);
    script.onerror = () => setError("Сервис входа Google недоступен. Можно загрузить CSV вручную.");
    document.head.appendChild(script);
    return () => { script.onload = null; script.onerror = null; };
  }, [settingsOpen]);
  useEffect(() => {
    if (!token) return undefined;
    const check = () => { if (document.visibilityState === "visible") loadRef.current(token, { quiet: true }); };
    const timer = window.setInterval(check, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [token]);
  useEffect(() => {
    if (editOpen || stageOpen || savingLead || savingStage) return;
    const rows = pendingRows.current;
    if (!rows) return;
    pendingRows.current = null;
    setStale(false);
    try { parseRows(rows); setSource({ rows, updatedAt: new Date().toISOString(), kind: "google" }); setSyncError(""); }
    catch (applyError) { setSyncError(/** @type {Error} */ (applyError).message); }
  }, [editOpen, stageOpen, savingLead, savingStage]);
  useEffect(() => {
    const onKey = event => {
      if (event.key !== "Escape") return;
      if (stageOpen && !savingStage) setStageOpen(false);
      else if (filterOpen) setFilterOpen(false);
      else if (editOpen && !savingLead) setEditOpen(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stageOpen, filterOpen, editOpen, settingsOpen, selectedId, savingStage, savingLead]);

  const saveNote = () => {
    if (!selected) return;
    const next = { ...notes, [selected.id]: { text: draft, updatedAt: new Date().toISOString() } };
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      setNotes(next);
      setSaveState("Сохранено локально");
      setMessage("Заметка сохранена на этом компьютере.");
    } catch {
      setError("Не удалось сохранить заметку. Проверьте свободное место браузера.");
    }
  };
  const importCsv = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setToken(""); applyRows(parseCsv(await file.text()), "csv"); setError(""); }
    catch (importError) { setError(importError.message || "Не удалось прочитать CSV."); }
    event.target.value = "";
  };
  const readGoogle = async (accessToken, range, renderOption = "FORMATTED_VALUE") => {
    const response = await fetch(`${SHEET_VALUES_URL}/${encodeURIComponent(range)}?valueRenderOption=${renderOption}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = /** @type {Error & { status?: number }} */ (new Error(result.error?.message || `Ошибка Google Sheets: ${response.status}`));
      reason.status = response.status;
      throw reason;
    }
    return result.values || [];
  };
  const connectGoogle = () => {
    const id = clientId.trim();
    if (!id) { setError("Вставьте OAuth Client ID для этого сайта."); return; }
    const oauth = googleOauth();
    if (!oauth) { setError("Сервис Google ещё загружается. Повторите через несколько секунд."); return; }
    localStorage.setItem(CLIENT_KEY, id);
    setError("");
    try {
      const client = oauth.initTokenClient({
        client_id: id,
        scope: GOOGLE_SCOPE,
        callback: result => {
          if (result.error) { setError(result.error_description || result.error); return; }
          setToken(result.access_token);
          loadGoogle(result.access_token);
        },
        error_callback: result => setError(result.message || result.type || "Вход Google не завершён."),
      });
      client.requestAccessToken();
    } catch (connectError) {
      setError(connectError.message || "Не удалось подключить Google.");
    }
  };
  const refresh = () => token ? loadGoogle(token) : setSettingsOpen(true);
  const openLead = id => { setSelectedId(id); setDetailTab("overview"); };
  const openLeadEdit = () => {
    if (!selected) return;
    if (!token || source.kind !== "google") { setSettingsOpen(true); return; }
    const fields = headers.filter(field => field && field !== "№");
    setEditDraft(Object.fromEntries(fields.map(field => [field, selected[field] || ""])));
    gateRef.current = { ...gateRef.current, edit: true };
    setEditOpen(true);
    setError("");
  };
  const readLiveRow = async lead => {
    const currentRange = rowRange(lead.rowNumber, Math.max(headers.length - 1, 0));
    const [liveValues, liveFormulas] = await Promise.all([
      readGoogle(token, currentRange).then(rows => rows[0] || []),
      readGoogle(token, currentRange, "FORMULA").then(rows => rows[0] || []),
    ]);
    return { liveValues, liveFormulas };
  };
  const postUpdates = async data => {
    const response = await fetch(`${SHEET_VALUES_URL}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ valueInputOption: "RAW", data }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = /** @type {Error & { status?: number }} */ (new Error(result.error?.message || `Ошибка записи: ${response.status}`));
      reason.status = response.status;
      throw reason;
    }
    if (result.totalUpdatedCells !== data.length) throw new Error("Google не подтвердил запись всех изменённых ячеек. Проверьте таблицу.");
  };
  const saveLead = async () => {
    if (!selected || !token || source.kind !== "google") return;
    const lead = selected;
    const previousSource = source;
    gateRef.current = { ...gateRef.current, saving: true };
    setSavingLead(true);
    setError("");
    let patched = false;
    try {
      const { liveValues, liveFormulas } = await readLiveRow(lead);
      const data = buildWriteRanges({ headers, lead, draft: editDraft, liveValues, liveFormulas });
      if (!data.length) { setEditOpen(false); setMessage("Изменений для сохранения нет."); return; }
      const changes = {};
      headers.forEach(field => {
        if (!field || field === "№") return;
        const next = String(editDraft[field] ?? "").trim();
        if (next !== String(lead[field] ?? "").trim()) changes[field] = next;
      });
      patched = true;
      setSource(current => ({ ...current, rows: patchLeadCells(current.rows, lead, changes) }));
      await postUpdates(data);
      gateRef.current = { ...gateRef.current, edit: false };
      setEditOpen(false);
      const reread = await loadGoogle(token, { quiet: true, force: true });
      setSelectedId(lead.id);
      if (reread) setMessage(`Сохранено в Google Таблице: ${data.length} полей.`);
      else setError("Изменения записаны, но перечитать таблицу не удалось. Нажмите обновление.");
    } catch (saveError) {
      const reason = /** @type {any} */ (saveError);
      if (patched) setSource(previousSource);
      if (reason.status === 401) setToken("");
      if (isSheetConflict(reason)) {
        await loadGoogle(token, { quiet: true, force: true });
        setSelectedId(lead.id);
      }
      setError(reason.message || "Не удалось сохранить изменения.");
    } finally {
      gateRef.current = { ...gateRef.current, saving: false };
      setSavingLead(false);
    }
  };
  const saveStage = async (raw, markRefusal) => {
    if (!selected) return;
    if (!token || source.kind !== "google") {
      setError("Подключите Google, чтобы записать стадию.");
      setSettingsOpen(true);
      return;
    }
    if (leads.statusFallback || !headers.includes("Статус")) {
      setError("В листе нет столбца «Статус». Запись стадии недоступна.");
      return;
    }
    const lead = selected;
    const previousSource = source;
    const changes = { "Статус": raw };
    if (markRefusal) changes["Этап"] = "отказ";
    gateRef.current = { ...gateRef.current, saving: true };
    setSavingStage(true);
    setError("");
    let patched = false;
    try {
      const { liveValues, liveFormulas } = await readLiveRow(lead);
      const data = markRefusal
        ? buildWriteRanges({ headers, lead, draft: { ...lead, ...changes }, liveValues, liveFormulas })
        : writeCell({ headers, lead, field: "Статус", value: raw, liveValues, liveFormulas });
      if (!data.length) { setStageOpen(false); setMessage("Изменений для сохранения нет."); return; }
      patched = true;
      setSource(current => ({ ...current, rows: patchLeadCells(current.rows, lead, changes) }));
      const nextStage = parseStage(raw);
      setView(current => ({ ...current, stage: stageKey(nextStage) }));
      if (nextStage.kind === "closed") setShowClosed(true);
      gateRef.current = { ...gateRef.current, stage: false };
      setStageOpen(false);
      await postUpdates(data);
      const reread = await loadGoogle(token, { quiet: true, force: true });
      setSelectedId(lead.id);
      if (reread) setMessage("Стадия записана в таблицу.");
      else setError("Стадия записана, но перечитать таблицу не удалось. Нажмите обновление.");
    } catch (saveError) {
      const reason = /** @type {any} */ (saveError);
      if (patched) setSource(previousSource);
      await loadGoogle(token, { quiet: true, force: true });
      setSelectedId(lead.id);
      if (reason.status === 401) setToken("");
      setStageOpen(false);
      setError(isSheetConflict(reason) ? "Лид изменён в таблице, обновили данные" : (reason.message || "Не удалось сохранить стадию."));
    } finally {
      gateRef.current = { ...gateRef.current, saving: false };
      setSavingStage(false);
    }
  };
  const exportNotes = () => {
    const blob = new Blob([JSON.stringify({ spreadsheetId: SHEET_ID, exportedAt: new Date().toISOString(), notes }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lead-crm-notes.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importNotes = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.spreadsheetId !== SHEET_ID || !payload.notes || typeof payload.notes !== "object" || Array.isArray(payload.notes)) throw new Error("Это не резервная копия заметок для данной таблицы.");
      const cleaned = Object.fromEntries(Object.entries(payload.notes).filter(([id, item]) => /^\d+$/.test(id) && typeof item?.text === "string").map(([id, item]) => [id, { text: item.text, updatedAt: item.updatedAt || new Date().toISOString() }]));
      const next = { ...notes, ...cleaned };
      localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      setNotes(next);
      setDraft(selected ? next[selected.id]?.text || "" : "");
      setMessage(`Восстановлено ${Object.keys(cleaned).length} заметок.`);
    } catch (importError) {
      setError(importError.message || "Не удалось восстановить заметки.");
    }
    event.target.value = "";
  };
  const openZalo = async lead => {
    if (!lead?.contacts?.zaloHref) return;
    const text = shareText(lead, detailTab, language);
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setError("");
        setMessage("Текст скопирован · вставьте в Zalo");
      } catch {
        setMessage("");
        setError("Не удалось скопировать текст.");
      }
    }
    window.clearTimeout(zaloTimer.current);
    zaloTimer.current = window.setTimeout(() => {
      window.open(lead.contacts.zaloHref, "_blank", "noopener,noreferrer");
    }, 700);
  };
  const openWhatsApp = lead => {
    const href = whatsappHref(lead, shareText(lead, detailTab, language));
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };
  const copyCurrent = async () => {
    if (!selected) return;
    const text = shareText(selected, detailTab, language);
    if (!text) { setError("В этой вкладке нет текста для копирования."); return; }
    try {
      await navigator.clipboard.writeText(text);
      setError("");
      setMessage("Текст скопирован.");
    } catch {
      setError("Не удалось скопировать текст.");
    }
  };
  const closedCount = tabs.find(tab => tab.key === "closed")?.count || 0;
  const sortLabel = SORTS.find(item => item.id === view.sort)?.label || "Fit";
  const canWrite = Boolean(token && source.kind === "google" && !leads.statusFallback);

  const overlayOpen = Boolean(selected || settingsOpen || editOpen || stageOpen || filterOpen);
  return <div className="app-shell">
    <div className="app-frame" inert={overlayOpen ? true : undefined}>
    <aside className="sidebar">
      <div className="brand"><img src="/lotus.png" alt="" /><span className="brand-name">Приоритет</span></div>
      <nav aria-label="Разделы CRM">
        <button type="button" className={section === "leads" ? "nav-item active" : "nav-item"} aria-label="Лиды" onClick={() => setSection("leads")}><Icon name="leads" /><span className="nav-label">Лиды</span></button>
        <button type="button" className={section === "notes" ? "nav-item active" : "nav-item"} aria-label="Мои заметки" onClick={() => setSection("notes")}><Icon name="notes" /><span className="nav-label">Мои заметки</span> <small>{noteCount}</small></button>
        <button type="button" className="nav-item" aria-label="Подключение" onClick={() => setSettingsOpen(true)}><Icon name="settings" /><span className="nav-label">Подключение</span></button>
      </nav>
      <div className="sidebar-bottom"><span>CRM для Google Таблицы</span><span>Запись — через ваш Google-аккаунт</span></div>
    </aside>
    <main className="workspace">
      <div className="mobile-chrome">
      <header className="topbar">
        <label className="search">
          <Icon name="search" />
          <input aria-label="Поиск лидов" placeholder="Поиск" value={query} onChange={event => setQuery(event.target.value)} />
          {query && <button type="button" aria-label="Очистить поиск" onClick={() => setQuery("")}><Icon name="close" /></button>}
        </label>
        <div className="mobile-tools">
          <button type="button" className="tool-btn" onClick={() => setFilterOpen(true)}>Фильтры ({filterCount})</button>
          <button type="button" className="tool-btn sort-btn" aria-label={`Сортировка: ${sortLabel}`} aria-expanded={sortOpen} onClick={() => setSortOpen(open => !open)}><Icon name="sort" />↓ {sortLabel}</button>
        </div>
        <button type="button" className="source-status" onClick={refresh} title="Обновить данные из Google Таблицы" aria-label={sourceLabel}>
          <span className="sheet-mark"><Icon name="notes" /></span>
          <span><strong>{sourceLabel}</strong><small>{syncing ? "Загрузка…" : `Обновлено: ${readableDate(source.updatedAt)}`}</small></span>
          <Icon name="refresh" />
        </button>
      </header>
      {sortOpen && (
        <div className="sort-menu" role="listbox" aria-label="Сортировка">
          {SORTS.map(item => (
            <button key={item.id} type="button" role="option" aria-selected={view.sort === item.id} className={view.sort === item.id ? "selected" : ""} onClick={() => { setView(current => ({ ...current, sort: item.id })); setSortOpen(false); }}>↓ {item.label}</button>
          ))}
        </div>
      )}
      {!canWrite && source.kind !== "none" && <button type="button" className="connect-banner" onClick={() => setSettingsOpen(true)}>{sourceLabel}</button>}
      {sheetWarning && <div className="soft-banner" role="status">{sheetWarning}</div>}
      {syncError && !settingsOpen && <div className="soft-banner" role="status">{syncError}</div>}
      {!wide && source.kind !== "none" && (
        <div className="stage-tabs-wrap">
          <div className="stage-tabs" role="tablist" aria-label="Стадии">
            {tabs.map(tab => (
              <button key={tab.key} type="button" role="tab" aria-selected={activeStage === tab.key} className={activeStage === tab.key ? "stage-tab selected" : "stage-tab"} onClick={() => setView(current => ({ ...current, stage: tab.key }))}>
                <span>{tab.label}</span>
                <span className="count">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
      <div className="section-heading">
        <div>
          <h1>{section === "notes" ? "Мои заметки" : "Лиды"}</h1>
          <p>{source.kind === "none" ? "Подключите таблицу, чтобы увидеть воронку" : `${filtered.length} из ${leads.length}`}</p>
        </div>
        <a href={sheetUrl} target="_blank" rel="noreferrer">Таблица <Icon name="link" /></a>
      </div>
      {source.kind !== "none" && (
        <div className="toolbar">
          <button type="button" className="secondary-btn" onClick={() => setFilterOpen(true)}><Icon name="filter" />Фильтры ({filterCount})</button>
          <button type="button" className="tool-btn sort-btn" aria-label={`Сортировка: ${sortLabel}`} aria-expanded={sortOpen} onClick={() => setSortOpen(open => !open)}><Icon name="sort" />↓ {sortLabel}</button>
          {wide && <button type="button" className={showClosed || activeStage === "closed" ? "secondary-btn selected" : "secondary-btn"} aria-pressed={showClosed || activeStage === "closed"} onClick={() => {
            if (showClosed || activeStage === "closed") {
              setShowClosed(false);
              if (activeStage === "closed") setView(current => ({ ...current, stage: defaultStageKey(leads.filter(lead => lead.stage.kind !== "closed")) || defaultStageKey(leads) }));
            } else setShowClosed(true);
          }}>✕ Закрытые ({closedCount})</button>}
        </div>
      )}
      {source.kind === "none" ? (
        <section className="no-selection">
          <h2>Подключите Google Таблицу</h2>
          <p>Лиды загрузятся из листа «Лиды» после входа в Google-аккаунт с доступом к таблице. Сайт по ссылке открывается без входа, данные в сборку не включены.</p>
          <button type="button" className="primary-btn" onClick={() => setSettingsOpen(true)}>Подключить Google</button>
        </section>
      ) : (
        <LeadList
          wide={wide}
          tabs={tabs}
          leads={filtered}
          activeStage={activeStage}
          selectedId={selectedId}
          notes={notes}
          onOpen={openLead}
          onZalo={openZalo}
          showClosed={showClosed || activeStage === "closed"}
        />
      )}
    </main>
    <nav className="tab-bar" aria-label="Разделы CRM">
      <button type="button" className={section === "leads" ? "active" : ""} onClick={() => setSection("leads")}><Icon name="leads" />Лиды</button>
      <button type="button" className={section === "notes" ? "active" : ""} onClick={() => setSection("notes")}><Icon name="notes" />Мои заметки <small>{noteCount}</small></button>
      <button type="button" onClick={() => setSettingsOpen(true)}><Icon name="settings" />Подключение</button>
    </nav>
    </div>
    {selected && (
      <LeadCard
        lead={selected}
        note={notes[selected.id]}
        draft={draft}
        saveState={saveState}
        tab={detailTab}
        language={language}
        canEdit={Boolean(token && source.kind === "google")}
        onClose={() => setSelectedId(null)}
        onEdit={openLeadEdit}
        onStage={() => { gateRef.current = { ...gateRef.current, stage: true }; setStageOpen(true); }}
        onTab={setDetailTab}
        onLanguage={setLanguage}
        onDraft={value => { setDraft(value); setSaveState(""); }}
        onSaveNote={saveNote}
        onCopy={copyCurrent}
        onZalo={openZalo}
        onWhatsApp={openWhatsApp}
      />
    )}
    {stageOpen && selected && (
      <StageSheet
        key={selected.id}
        lead={selected}
        choices={stageChoices(leads)}
        saving={savingStage}
        canWrite={canWrite}
        onClose={() => { if (!savingStage) setStageOpen(false); }}
        onSave={saveStage}
        onConnect={() => { setStageOpen(false); setSettingsOpen(true); }}
      />
    )}
    {filterOpen && (
      <FilterSheet leads={leads} view={view} resultCount={filtered.length} onChange={setView} onClose={() => setFilterOpen(false)} />
    )}
    {settingsOpen && (
      <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="modal-heading">
            <div>
              <h2 id="settings-title">Подключение данных</h2>
              <p>Редактирование и обновление таблицы работают через ваш Google-аккаунт. Локальные заметки остаются в этом браузере.</p>
            </div>
            <button type="button" className="icon-button" aria-label="Закрыть" onClick={() => setSettingsOpen(false)}><Icon name="close" /></button>
          </div>
          <div className="settings-block">
            <h3>Google Таблица</h3>
            <p>Включите Google Sheets API, создайте OAuth Client ID типа «Веб-приложение» и добавьте в разрешённые источники JavaScript <code>{window.location.origin}</code>. Подключайте аккаунт с правом редактирования таблицы.</p>
            <label>OAuth Client ID<input value={clientId} onChange={event => setClientId(event.target.value)} placeholder="xxxx.apps.googleusercontent.com" /></label>
            <button type="button" className={syncing ? "primary-btn is-loading" : "primary-btn"} onClick={connectGoogle} disabled={syncing || !googleReady}>{syncing ? "Загрузка…" : googleReady ? "Подключить Google" : "Загрузка входа Google…"}</button>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Открыть Google Cloud Console <Icon name="link" /></a>
            <p className="sync-hint">{syncError || "Изменения с Google Таблицы проверяются каждые 5 секунд, пока вкладка открыта. Во время правки новые данные не затирают черновик."}</p>
          </div>
          <div className="settings-block">
            <h3>Загрузить CSV вручную</h3>
            <p>В Google Таблице выберите «Файл → Скачать → CSV». Заметки сохранятся при обновлении списка.</p>
            <input ref={fileInput} type="file" accept=".csv,text/csv" className="visually-hidden" onChange={importCsv} />
            <button type="button" className="secondary-btn" onClick={() => fileInput.current?.click()}><Icon name="upload" />Выбрать CSV</button>
          </div>
          <div className="settings-block">
            <h3>Резервная копия заметок</h3>
            <p>Скачайте копию перед очисткой браузера или переносом CRM. «Моя заметка» не пишется в столбец «Заметка».</p>
            <div className="settings-actions">
              <button type="button" className="secondary-btn" onClick={exportNotes}><Icon name="download" />Скачать JSON</button>
              <input ref={notesInput} type="file" accept=".json,application/json" className="visually-hidden" onChange={importNotes} />
              <button type="button" className="secondary-btn" onClick={() => notesInput.current?.click()}><Icon name="upload" />Восстановить JSON</button>
            </div>
          </div>
          <p className="privacy-note">Источник: <a href={sheetUrl} target="_blank" rel="noreferrer">лист «Лиды»</a>. Сайт открывается каждому, у кого есть ссылка; доступ к данным определяют права Google Таблицы.</p>
        </section>
      </div>
    )}
    {editOpen && selected && (
      <EditModal
        lead={selected}
        headers={headers}
        leads={leads}
        draft={editDraft}
        saving={savingLead}
        onChange={(field, value) => setEditDraft(previous => ({ ...previous, [field]: value }))}
        onClose={() => { if (!savingLead) setEditOpen(false); }}
        onSave={saveLead}
      />
    )}
    {stale && <div className="stale-banner" role="status">В таблице есть новые данные</div>}
    {(message || error) && <div role="status" className={error ? "toast error" : "toast"}>{error || message}</div>}
  </div>;
}
