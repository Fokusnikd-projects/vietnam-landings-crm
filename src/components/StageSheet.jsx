import { useState } from "react";
import { Icon } from "./icons.jsx";

export function StageSheet({ lead, choices, saving, canWrite, onClose, onSave }) {
  const [raw, setRaw] = useState(lead.stage.raw || "");
  const [markRefusal, setMarkRefusal] = useState(true);
  const unchanged = raw === (lead.stage.raw || "");
  return (
    <div className="sheet-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="stage-title">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <h2 id="stage-title">Стадия · № {lead.id}</h2>
          <button type="button" className="icon-button" aria-label="Закрыть стадии" onClick={onClose} disabled={saving}><Icon name="close" /></button>
        </div>
        <div className="choice-list" role="radiogroup" aria-label="Новая стадия">
          {choices.map(choice => (
            <label key={choice.raw} className={raw === choice.raw ? "choice selected" : "choice"}>
              <input type="radio" name="stage" value={choice.raw} checked={raw === choice.raw} onChange={() => setRaw(choice.raw)} />
              <span>{choice.raw}</span>
            </label>
          ))}
        </div>
        {raw === "✕ отказ" && (
          <label className="check-line">
            <input type="checkbox" checked={markRefusal} onChange={event => setMarkRefusal(event.target.checked)} />
            <span>Поставить этап «отказ»</span>
          </label>
        )}
        {!canWrite && <p className="hint">Чтобы записать стадию, подключите Google-аккаунт с правом редактирования таблицы.</p>}
        <button
          type="button"
          className={saving ? "primary-btn is-loading" : "primary-btn"}
          disabled={saving || unchanged || !raw}
          onClick={() => onSave(raw, raw === "✕ отказ" && markRefusal)}
        >
          {saving ? "Сохранение…" : "Записать стадию"}
        </button>
      </section>
    </div>
  );
}
