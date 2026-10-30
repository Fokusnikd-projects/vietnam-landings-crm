import { useEffect, useMemo, useRef, useState } from "react";
import { SHEET_ID, SHEET_GID, SHEET_NAME, NOTES_KEY, CLIENT_KEY, GROUPS, readStored, parseRows, parseCsv, readableDate, safeUrl } from "./data";
import { GOOGLE_SCOPE, REFRESH_INTERVAL_MS, SHEET_VALUES_URL, buildWriteRanges, rowRange } from "./googleSheet";

const icons = { search:"\uE721", leads:"\uE8B7", notes:"\uE70B", settings:"\uE713", refresh:"\uE72C", link:"\uE71B", phone:"\uE717", copy:"\uE8C8", save:"\uE74E", close:"\uE8BB", upload:"\uE898", download:"\uE896", map:"\uE707", edit:"\uE70F" };
const Icon = ({ name }) => <span className="icon" aria-hidden="true">{icons[name]}</span>;
const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}`;

function LinkButton({ href, icon, children }) {
  const url = safeUrl(href);
  return url && <a className="text-link" href={url} target="_blank" rel="noreferrer"><Icon name={icon}/>{children}<Icon name="link"/></a>;
}

function Offer({ lead, language, setLanguage, onCopy, large = false }) {
  return <div className={large ? "offer-full" : "offer-pane"}>
    <div className="pane-top"><h3>Оффер для отправки</h3><button className={large ? "secondary-btn" : "icon-button"} onClick={onCopy} aria-label="Скопировать оффер"><Icon name="copy"/>{large && "Скопировать"}</button></div>
    <div className="language-tabs">{["EN","VI"].map(lang => <button key={lang} className={language === lang ? "selected" : ""} onClick={() => setLanguage(lang)}>{lang === "EN" ? "English" : "Tiếng Việt"}</button>)}</div>
    <div className="offer-text">{lead[`Оффер ${language}`] || "Текст оффера не указан."}</div>
  </div>;
}

export function App() {
  const [source, setSource] = useState({ rows:[], updatedAt:null, kind:"none" });
  const [notes, setNotes] = useState(() => readStored(NOTES_KEY, {}));
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("leads");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");
  const [offerLanguage, setOfferLanguage] = useState("EN");
  const [detailTab, setDetailTab] = useState("overview");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clientId, setClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem(CLIENT_KEY) || "");
  const [token, setToken] = useState("");
  const [googleReady, setGoogleReady] = useState(Boolean(window.google?.accounts?.oauth2));
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({});
  const [savingLead, setSavingLead] = useState(false);
  const [syncError, setSyncError] = useState("");
  const fileInput = useRef(null);
  const notesInput = useRef(null);
  const loadingRef = useRef(false);

  const leads = useMemo(() => { try { return parseRows(source.rows); } catch { return []; } }, [source]);
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return leads.filter(lead => {
      if (section === "notes" && !notes[lead.id]?.text?.trim()) return false;
      if (!needle) return true;
      return ["Название","Район","Ниша","Этап","Fit","Готовность","Флаги","Хук","Телефон"]
        .some(field => lead[field]?.toLocaleLowerCase().includes(needle)) || notes[lead.id]?.text?.toLocaleLowerCase().includes(needle);
    });
  }, [leads, notes, query, section]);
  const grouped = useMemo(() => Object.fromEntries(GROUPS.map(group => [group.id,
    matches.filter(lead => lead.bucket === group.id).sort((a,b) => {
      const rank = { "высокий":0, "средний":1, "низкий":2 };
      return (rank[a.Fit?.toLowerCase()] ?? 3) - (rank[b.Fit?.toLowerCase()] ?? 3) || Number(a.id) - Number(b.id);
    })
  ])), [matches]);
  const selected = matches.find(lead => lead.id === selectedId) || GROUPS.map(group => grouped[group.id][0]).find(Boolean) || null;
  const noteCount = Object.values(notes).filter(note => note.text?.trim()).length;
  const sourceLabel = source.kind === "google" ? (token ? "Google Таблица · запись" : "Google · переподключить") : source.kind === "csv" ? "CSV с этого компьютера" : "Google не подключён";

  useEffect(() => { if (selected?.id !== selectedId) setSelectedId(selected?.id || null); }, [selected?.id, selectedId]);
  useEffect(() => { setDraft(selected ? notes[selected.id]?.text || "" : ""); setSaveState(""); }, [selected?.id]);
  useEffect(() => { if (message || error) { const timer = setTimeout(() => { setMessage(""); setError(""); }, 7000); return () => clearTimeout(timer); } }, [message, error]);
  useEffect(() => {
    if (!settingsOpen || window.google?.accounts?.oauth2) { if (window.google?.accounts?.oauth2) setGoogleReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => setGoogleReady(true);
    script.onerror = () => setError("Сервис входа Google недоступен. Можно загрузить CSV вручную.");
    document.head.appendChild(script);
    return () => { script.onload = null; script.onerror = null; };
  }, [settingsOpen]);
  useEffect(() => {
    if (!token) return;
    const check = () => { if (document.visibilityState === "visible" && !editOpen) loadGoogle(token, { quiet:true }); };
    const timer = window.setInterval(check, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [token, editOpen]);

  const saveNote = () => {
    if (!selected) return;
    const next = { ...notes, [selected.id]: { text: draft, updatedAt: new Date().toISOString() } };
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(next)); setNotes(next); setSaveState("Сохранено локально"); setMessage("Заметка сохранена на этом компьютере."); }
    catch { setError("Не удалось сохранить заметку. Проверьте свободное место браузера."); }
  };
  const applyRows = (rows, kind, { quiet = false } = {}) => {
    const parsed = parseRows(rows);
    const next = { rows, updatedAt: new Date().toISOString(), kind };
    setSource(next);
    setSyncError("");
    if (!quiet) { setSettingsOpen(false); setMessage(`Загружено ${parsed.length} лидов.`); }
  };
  const importCsv = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setToken(""); applyRows(parseCsv(await file.text()), "csv"); setError(""); }
    catch (e) { setError(e.message || "Не удалось прочитать CSV."); }
    event.target.value = "";
  };
  const readGoogle = async (accessToken, range, renderOption = "FORMATTED_VALUE") => {
    const response = await fetch(`${SHEET_VALUES_URL}/${encodeURIComponent(range)}?valueRenderOption=${renderOption}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { const reason = new Error(result.error?.message || `Ошибка Google Sheets: ${response.status}`); reason.status = response.status; throw reason; }
    return result.values || [];
  };
  const loadGoogle = async (accessToken, { quiet = false } = {}) => {
    if (loadingRef.current) return false;
    loadingRef.current = true;
    if (!quiet) { setSyncing(true); setError(""); }
    try {
      const rows = await readGoogle(accessToken, `'${SHEET_NAME}'!A:AF`);
      applyRows(rows, "google", { quiet });
      return true;
    } catch (e) {
      if (e.status === 401) { setToken(""); setSyncError("Сессия Google истекла. Подключите аккаунт снова."); }
      else setSyncError(e.message || "Не удалось обновить таблицу.");
      if (!quiet) setError(e.message || "Не удалось обновить таблицу.");
      return false;
    } finally { loadingRef.current = false; if (!quiet) setSyncing(false); }
  };
  const connectGoogle = () => {
    const id = clientId.trim();
    if (!id) { setError("Вставьте OAuth Client ID для этого сайта."); return; }
    if (!window.google?.accounts?.oauth2) { setError("Сервис Google ещё загружается. Повторите через несколько секунд."); return; }
    localStorage.setItem(CLIENT_KEY, id); setError("");
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: id, scope: GOOGLE_SCOPE,
        callback: result => { if (result.error) { setError(result.error_description || result.error); return; } setToken(result.access_token); loadGoogle(result.access_token); },
        error_callback: result => setError(result.message || result.type || "Вход Google не завершён.")
      });
      client.requestAccessToken();
    } catch (e) { setError(e.message || "Не удалось подключить Google."); }
  };
  const refresh = () => token ? loadGoogle(token) : setSettingsOpen(true);
  const openLeadEdit = () => {
    if (!token || source.kind !== "google") { setSettingsOpen(true); return; }
    setEditDraft(Object.fromEntries(source.rows[0].filter(field => field && field !== "№").map(field => [field, selected[field] || ""])));
    setEditOpen(true); setError("");
  };
  const saveLead = async () => {
    if (!selected || !token || source.kind !== "google") return;
    setSavingLead(true); setError("");
    try {
      const headers = source.rows[0].map(value => String(value ?? "").trim());
      const currentRange = rowRange(selected.rowNumber, headers.length - 1);
      const [liveValues, liveFormulas] = await Promise.all([
        readGoogle(token, currentRange).then(rows => rows[0] || []),
        readGoogle(token, currentRange, "FORMULA").then(rows => rows[0] || [])
      ]);
      const data = buildWriteRanges({ headers, lead:selected, draft:editDraft, liveValues, liveFormulas });
      if (!data.length) { setEditOpen(false); setMessage("Изменений для сохранения нет."); return; }
      const response = await fetch(`${SHEET_VALUES_URL}:batchUpdate`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify({ valueInputOption:"RAW", data }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { const reason = new Error(result.error?.message || `Ошибка записи: ${response.status}`); reason.status = response.status; throw reason; }
      if (result.totalUpdatedCells !== data.length) throw new Error("Google не подтвердил запись всех изменённых ячеек. Проверьте таблицу.");
      setEditOpen(false);
      const reread = await loadGoogle(token, { quiet:true });
      if (reread) setMessage(`Сохранено в Google Таблице: ${data.length} полей.`);
      else setError("Изменения записаны, но перечитать таблицу не удалось. Нажмите обновление.");
    } catch (e) {
      if (e.status === 401) setToken("");
      setError(e.message || "Не удалось сохранить изменения.");
    } finally { setSavingLead(false); }
  };
  const exportNotes = () => {
    const blob = new Blob([JSON.stringify({ spreadsheetId: SHEET_ID, exportedAt: new Date().toISOString(), notes }, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "lead-crm-notes.json"; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setNotes(next); setDraft(selected ? next[selected.id]?.text || "" : "");
      setMessage(`Восстановлено ${Object.keys(cleaned).length} заметок.`);
    } catch (e) { setError(e.message || "Не удалось восстановить заметки."); }
    event.target.value = "";
  };
  const copyOffer = async () => {
    const text = selected?.[`Оффер ${offerLanguage}`];
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setMessage("Оффер скопирован."); }
    catch { setError("Не удалось скопировать текст."); }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/lotus.png" alt=""/><span>Приоритет</span></div>
      <nav aria-label="Разделы CRM">
        <button className={section === "leads" ? "nav-item active" : "nav-item"} onClick={() => setSection("leads")}><Icon name="leads"/>Лиды</button>
        <button className={section === "notes" ? "nav-item active" : "nav-item"} onClick={() => setSection("notes")}><Icon name="notes"/>С заметками <small>{noteCount}</small></button>
        <button className="nav-item" onClick={() => setSettingsOpen(true)}><Icon name="settings"/>Подключение</button>
      </nav>
      <div className="sidebar-bottom"><span>CRM для Google Таблицы</span><span>Запись — через ваш Google-аккаунт</span></div>
    </aside>
    <main className="workspace">
      <header className="topbar">
        <label className="search"><Icon name="search"/><input aria-label="Поиск лидов" placeholder="Поиск по названию, району, нише, заметке..." value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Очистить поиск" onClick={() => setQuery("")}><Icon name="close"/></button>}</label>
        <button className="source-status" onClick={refresh} title="Обновить данные из Google Таблицы"><span className="sheet-mark"><Icon name="notes"/></span><span><strong>{sourceLabel}</strong><small>{syncing ? "Загрузка…" : `Обновлено: ${readableDate(source.updatedAt)}`}</small></span><Icon name="refresh"/></button>
      </header>
      <section className="board" aria-label="Группы лидов">
        {GROUPS.map(group => <div className={`board-column ${group.id}`} key={group.id}>
          <div className="column-heading"><span className="state-dot"/><h2>{group.title}</h2><span className="count">{grouped[group.id].length}</span></div>
          <div className="column-labels"><span>Название / Район · Ниша</span><span>Fit</span><span>Контакты</span></div>
          <div className="lead-list">{grouped[group.id].length ? grouped[group.id].map(lead => <div key={lead.id} className={selected?.id === lead.id ? "lead-row selected" : "lead-row"}>
            <button className="lead-select" onClick={() => { setSelectedId(lead.id); setDetailTab("overview"); }}>
              <span className="lead-main"><strong title={lead["Название"]}>{lead["Название"]}</strong><small>{lead["Район"] || "Район не указан"} · {lead["Ниша"] || "Ниша не указана"}</small></span>
              <span className={`fit fit-${lead.Fit?.toLowerCase() || "unknown"}`}>{lead.Fit || "—"}</span>
              {notes[lead.id]?.text?.trim() && <span className="note-marker" title="Есть локальная заметка"><Icon name="notes"/></span>}
            </button>
            <span className="lead-actions">
              {lead["Телефон"] && <a href={`tel:${lead["Телефон"].replace(/[^+\d]/g,"")}`} title="Позвонить" aria-label={`Позвонить: ${lead["Название"]}`}><Icon name="phone"/></a>}
              {safeUrl(lead["Google Maps"]) && <a href={safeUrl(lead["Google Maps"])} target="_blank" rel="noreferrer" title="Google Maps" aria-label={`Google Maps: ${lead["Название"]}`}><Icon name="map"/></a>}
              {safeUrl(lead["Facebook"]) && <a href={safeUrl(lead["Facebook"])} target="_blank" rel="noreferrer" title="Facebook" aria-label={`Facebook: ${lead["Название"]}`}><Icon name="link"/></a>}
            </span>
          </div>) : <div className="empty-column">Здесь пока нет лидов</div>}</div>
        </div>)}
      </section>
      {selected ? <section className="inspector" aria-label="Карточка лида">
        <div className="inspector-head"><div><div className="inspector-title"><h2>{selected["Название"]}</h2><span className={`readiness ${selected.bucket}`}>{selected["Готовность"] || "Проверить"}</span></div><p>{selected["Район"]} · {selected["Ниша"] || "Ниша не указана"} · № {selected.id}</p></div><div className="inspector-head-tools"><button className="secondary-btn edit-lead-button" onClick={openLeadEdit}><Icon name="edit"/>{token && source.kind === "google" ? "Изменить в таблице" : "Подключить для изменений"}</button><div className="detail-tabs" role="tablist" aria-label="Детали лида">{[["overview","Обзор"],["research","Ресёрч"],["offer","Оффер"]].map(([id,label]) => <button key={id} role="tab" aria-selected={detailTab===id} className={detailTab===id?"selected":""} onClick={() => setDetailTab(id)}>{label}</button>)}</div></div></div>
        {detailTab === "overview" && <div className="inspector-grid">
          <div className="info-pane"><h3>Основная информация <small>из таблицы</small></h3><dl>{[["Район","Район"],["Ниша","Ниша"],["Этап","Этап"],["Fit","Fit"],["Флаги","Флаги"],["Туристы","Туристы"],["Рейтинг","Рейтинг"],["Отзывов","Отзывов"]].map(([label,key]) => <div key={key}><dt>{label}</dt><dd>{selected[key] || "—"}</dd></div>)}</dl><p className="mini-source">{selected["Детали"] || "Дополнительных сведений нет."}</p></div>
          <div className="action-pane"><h3>Хук для контакта</h3><div className="hook">{selected["Хук"] || "Хук пока не указан в таблице."}</div><h3>Контакты</h3><div className="links-stack">{selected["Телефон"] && <a className="text-link" href={`tel:${selected["Телефон"].replace(/[^+\d]/g,"")}`}><Icon name="phone"/>{selected["Телефон"]}</a>}<LinkButton href={selected["Google Maps"]} icon="map">Google Maps</LinkButton><LinkButton href={selected["Facebook"]} icon="link">Facebook</LinkButton><LinkButton href={selected["WhatsApp"]} icon="link">WhatsApp</LinkButton></div><div className="local-note"><h3>Моя заметка <small>локально</small></h3><textarea aria-label="Локальная заметка" placeholder="Что важно помнить? Следующий шаг, результат контакта…" value={draft} onChange={e => { setDraft(e.target.value); setSaveState(""); }}/><div className="note-footer"><span>{saveState || (notes[selected.id]?.updatedAt ? `Сохранено: ${readableDate(notes[selected.id].updatedAt)}` : "Пока не сохранено")}</span><button className="primary-btn" onClick={saveNote}><Icon name="save"/>Сохранить заметку</button></div></div></div>
          <Offer lead={selected} language={offerLanguage} setLanguage={setOfferLanguage} onCopy={copyOffer}/>
        </div>}
        {detailTab === "research" && <div className="long-content"><div><h3>Ресёрч</h3><p>{selected["Ресёрч"] || "Ресёрч не указан."}</p></div><div><h3>Детали</h3><p>{selected["Детали"] || "Детали не указаны."}</p><h3>Адрес</h3><p>{selected["Адрес"] || "Адрес не указан."}</p></div></div>}
        {detailTab === "offer" && <Offer lead={selected} language={offerLanguage} setLanguage={setOfferLanguage} onCopy={copyOffer} large/>}
      </section> : <section className="no-selection">{source.kind === "none" ? <><h2>Подключите Google Таблицу</h2><p>Лиды загрузятся из таблицы после входа в Google-аккаунт с доступом к ней. Сайт по ссылке открывается без входа, но данные в публичную сборку не включены.</p><button className="primary-btn" onClick={() => setSettingsOpen(true)}>Подключить Google</button></> : <>Нет лидов по текущему запросу. Очистите поиск или загрузите таблицу.</>}</section>}
    </main>
    {settingsOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-heading"><div><h2 id="settings-title">Подключение данных</h2><p>Редактирование и обновление таблицы работают через ваш Google-аккаунт. Локальные заметки остаются в этом браузере.</p></div><button className="icon-button" aria-label="Закрыть" onClick={() => setSettingsOpen(false)}><Icon name="close"/></button></div>
      <div className="settings-block"><h3>Google Таблица</h3><p>Включите Google Sheets API, создайте OAuth Client ID типа «Веб-приложение» и добавьте в разрешённые источники JavaScript <code>{window.location.origin}</code>. Подключайте аккаунт с правом редактирования таблицы.</p><label>OAuth Client ID<input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com"/></label><button className="primary-btn" onClick={connectGoogle} disabled={syncing || !googleReady}>{syncing ? "Загрузка…" : googleReady ? "Подключить Google" : "Загрузка входа Google…"}</button><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Открыть Google Cloud Console <Icon name="link"/></a><p className="sync-hint">{syncError || "Изменения с Google Таблицы проверяются каждые 5 секунд, пока вкладка открыта. После истечения сессии потребуется повторное подключение."}</p></div>
      <div className="settings-block"><h3>Загрузить CSV вручную</h3><p>В Google Таблице выберите «Файл → Скачать → CSV». Заметки сохранятся при обновлении списка.</p><input ref={fileInput} type="file" accept=".csv,text/csv" className="visually-hidden" onChange={importCsv}/><button className="secondary-btn" onClick={() => fileInput.current?.click()}><Icon name="upload"/>Выбрать CSV</button></div>
      <div className="settings-block"><h3>Резервная копия заметок</h3><p>Скачайте копию перед очисткой браузера или переносом CRM.</p><div className="settings-actions"><button className="secondary-btn" onClick={exportNotes}><Icon name="download"/>Скачать JSON</button><input ref={notesInput} type="file" accept=".json,application/json" className="visually-hidden" onChange={importNotes}/><button className="secondary-btn" onClick={() => notesInput.current?.click()}><Icon name="upload"/>Восстановить JSON</button></div></div>
      <p className="privacy-note">Источник: <a href={sheetUrl} target="_blank" rel="noreferrer">лист «Лиды»</a>. Сайт открывается каждому, у кого есть ссылка; доступ к данным определяют права Google Таблицы.</p>
    </section></div>}
    {editOpen && selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !savingLead) setEditOpen(false); }}><section className="settings-modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
      <div className="modal-heading"><div><h2 id="edit-title">Изменить лида № {selected.id}</h2><p>Изменённые поля будут записаны в строку {selected.rowNumber} листа «{SHEET_NAME}».</p></div><button className="icon-button" aria-label="Закрыть" onClick={() => setEditOpen(false)} disabled={savingLead}><Icon name="close"/></button></div>
      <div className="edit-fields">{source.rows[0].filter(field => field && field !== "№").map(field => <label key={field}>{field}{["Детали","Ресёрч","Оффер EN","Оффер VI","Хук","Заметка","Интервью: деталь","Интервью VI","Интервью EN","Интервью: заметка"].includes(field)
        ? <textarea value={editDraft[field] ?? ""} onChange={e => setEditDraft(previous => ({ ...previous, [field]:e.target.value }))}/>
        : <input value={editDraft[field] ?? ""} onChange={e => setEditDraft(previous => ({ ...previous, [field]:e.target.value }))}/>}</label>)}</div>
      <div className="edit-footer"><span>Перед записью CRM проверит, что строка и изменяемые ячейки остались прежними.</span><div><button className="secondary-btn" onClick={() => setEditOpen(false)} disabled={savingLead}>Отмена</button><button className="primary-btn" onClick={saveLead} disabled={savingLead}>{savingLead ? "Сохранение…" : "Сохранить в Google Таблице"}</button></div></div>
    </section></div>}
    {(message || error) && <div role="status" className={error ? "toast error" : "toast"}>{error || message}</div>}
  </div>;
}
