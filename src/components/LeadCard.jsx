import {
  CONTACT_FIELDS, INTERVIEW_FIELDS, OFFER_FIELDS, OVERVIEW_FIELDS, RESEARCH_FIELDS, SOURCE_FIELD,
  fitClass, hasTourists, isPolished, leadAlert, ratingLine, readableDate, textParts,
} from "../data.js";
import { ContactBar } from "./ContactBar.jsx";
import { Icon } from "./icons.jsx";

const TABS = [
  ["overview", "Обзор"],
  ["interview", "Интервью"],
  ["offer", "Оффер"],
  ["research", "Ресёрч"],
];

function LinkedText({ value, empty }) {
  if (!value) return <p className="muted">{empty}</p>;
  return (
    <p className="linked-text">
      {textParts(value).map((part, index) => part.type === "link" && part.href
        ? <a key={index} href={part.href} target="_blank" rel="noreferrer">{part.value}</a>
        : <span key={index}>{part.value}</span>)}
    </p>
  );
}

function LanguageSwitch({ language, onLanguage }) {
  return (
    <div className="language-tabs" role="tablist" aria-label="Язык текста">
      {["VI", "EN"].map(lang => (
        <button key={lang} type="button" role="tab" aria-selected={language === lang} className={language === lang ? "selected" : ""} onClick={() => onLanguage(lang)}>
          {lang === "VI" ? "Tiếng Việt" : "English"}
        </button>
      ))}
    </div>
  );
}

function FieldBlock({ label, children }) {
  return (
    <section className="field-block">
      <h3>{label}</h3>
      {children}
    </section>
  );
}

export function LeadCard({
  lead, note, draft, saveState, tab, language, canEdit,
  onClose, onEdit, onStage, onTab, onLanguage, onDraft, onSaveNote, onCopy, onZalo, onWhatsApp,
}) {
  const alert = leadAlert(lead);
  const address = lead["Адрес"];
  const maps = lead.contacts?.mapsHref;
  const sheetNote = String(lead["Заметка"] || "").trim();
  const showSheetNote = Boolean(sheetNote) && sheetNote !== alert.trim();
  const subtitle = [`№ ${lead.id}`, lead["Район"], lead["Ниша"], ratingLine(lead)].filter(Boolean).join(" · ");
  const overviewFields = OVERVIEW_FIELDS.filter(field => field !== "Заметка" || showSheetNote);
  return (
    <div className="card-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="lead-card" role="dialog" aria-modal="true" aria-labelledby="lead-card-title">
        <header className="card-head">
          <button type="button" className="icon-button" aria-label="Закрыть карточку" onClick={onClose}><Icon name="back" /></button>
          <div className="card-title">
            <h2 id="lead-card-title">{lead["Название"] || "Без названия"}</h2>
            <p className="card-subtitle">{subtitle}</p>
          </div>
        </header>
        <div className="card-scroll">
          {maps ? <a className="address-link" href={maps} target="_blank" rel="noreferrer">{address || "Открыть в Maps"}</a> : <p className="address-link static">{address || "Адрес не указан"}</p>}
          <div className="badge-row">
            <button type="button" className={`stage-chip ${lead.stage.kind}`} onClick={onStage}>{lead.stage.raw || "без статуса"} ▾</button>
            <span className={fitClass(lead.Fit)}>{lead.Fit || "Fit не указан"}</span>
            <span className="badge">{hasTourists(lead) ? `Туристы: ${lead["Туристы"]}` : "Туристы: нет"}</span>
            <span className={`badge readiness ${lead.bucket}`}>{lead["Готовность"] || "Готовность не указана"}</span>
            <span className="badge">Этап: {lead["Этап"] || "—"}</span>
            {Object.prototype.hasOwnProperty.call(lead, SOURCE_FIELD) && <span className="badge">Источник: {lead[SOURCE_FIELD] || "—"}</span>}
          </div>
          <button type="button" className="secondary-btn card-edit" onClick={onEdit}><Icon name="edit" />{canEdit ? "Изменить" : "Подключить Google"}</button>
          {alert && <div className="alert-banner" role="status">{alert}</div>}
          <div className="detail-tabs" role="tablist" aria-label="Разделы карточки">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "selected" : ""} onClick={() => onTab(id)}>{label}</button>
            ))}
          </div>
          {tab === "overview" && (
            <div className="tab-panel">
              {overviewFields.map(field => (
                <FieldBlock key={field} label={field}>
                  {field === "Флаги" ? (
                    lead.flags?.length ? <div className="chip-row">{lead.flags.map(flag => <span key={flag} className="chip static">{flag}</span>)}</div> : <p className="muted">—</p>
                  ) : field === "Хук" ? <div className="hook">{lead[field] || "Хук пока не указан."}</div>
                    : <p className="plain-text">{lead[field] || "—"}</p>}
                </FieldBlock>
              ))}
              <FieldBlock label="Контакты">
                <dl className="info-list">
                  {CONTACT_FIELDS.map(field => (
                    <div key={field}>
                      <dt>{field}</dt>
                      <dd>{field === "Zalo" && !lead.contacts.zaloHref ? (lead.contacts.zaloText || "—") : (lead[field] || "—")}</dd>
                    </div>
                  ))}
                </dl>
              </FieldBlock>
              <FieldBlock label="Моя заметка">
                <p className="hint">Только в этом браузере. В столбец «Заметка» не записывается.</p>
                <textarea aria-label="Локальная заметка" placeholder="Следующий шаг, результат контакта…" value={draft} onChange={event => onDraft(event.target.value)} />
                <div className="note-footer">
                  <span>{saveState || (note?.updatedAt ? `Сохранено: ${readableDate(note.updatedAt)}` : "Пока не сохранено")}</span>
                  <button type="button" className="primary-btn" onClick={onSaveNote}><Icon name="save" />Сохранить заметку</button>
                </div>
              </FieldBlock>
            </div>
          )}
          {tab === "interview" && (
            <div className="tab-panel">
              <FieldBlock label={INTERVIEW_FIELDS[0]}>
                <p className="plain-text">{lead[INTERVIEW_FIELDS[0]] || "Канал не указан."}</p>
              </FieldBlock>
              <LanguageSwitch language={language} onLanguage={onLanguage} />
              <div className="pane-top">
                <h3>{language === "VI" ? INTERVIEW_FIELDS[1] : INTERVIEW_FIELDS[2]}</h3>
                <button type="button" className="secondary-btn" onClick={onCopy}><Icon name="copy" />Скопировать</button>
              </div>
              <div className="offer-text">{lead[language === "VI" ? INTERVIEW_FIELDS[1] : INTERVIEW_FIELDS[2]] || "Текст интервью не указан."}</div>
              <FieldBlock label={INTERVIEW_FIELDS[3]}>
                <p className="plain-text">{lead[INTERVIEW_FIELDS[3]] || "—"}</p>
              </FieldBlock>
            </div>
          )}
          {tab === "offer" && (
            <div className="tab-panel">
              <div className="pane-top">
                <h3>Оффер</h3>
                {isPolished(lead) && <span className="badge polished">текст отполирован</span>}
              </div>
              {lead[OFFER_FIELDS[2]] && <p className="hint">Редактура: {lead[OFFER_FIELDS[2]]}</p>}
              <LanguageSwitch language={language} onLanguage={onLanguage} />
              <div className="pane-top">
                <h3>{language === "VI" ? OFFER_FIELDS[1] : OFFER_FIELDS[0]}</h3>
                <button type="button" className="secondary-btn" onClick={onCopy}><Icon name="copy" />Скопировать</button>
              </div>
              <div className="offer-text">{lead[language === "VI" ? OFFER_FIELDS[1] : OFFER_FIELDS[0]] || "Текст оффера не указан."}</div>
            </div>
          )}
          {tab === "research" && (
            <div className="tab-panel">
              {RESEARCH_FIELDS.map(field => (
                <FieldBlock key={field} label={field}>
                  <LinkedText value={lead[field]} empty="Ресёрч не указан." />
                </FieldBlock>
              ))}
            </div>
          )}
        </div>
        <ContactBar lead={lead} onZalo={onZalo} onWhatsApp={onWhatsApp} />
      </section>
    </div>
  );
}
