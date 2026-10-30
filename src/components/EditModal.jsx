import { useState } from "react";
import { LONG_FIELDS, SELECT_FIELDS, SHEET_NAME, editGroupsFor, uniqueValues } from "../data.js";
import { Icon } from "./icons.jsx";

function EditField({ field, value, options, onChange }) {
  const [other, setOther] = useState(() => Boolean(options && value && !options.includes(value)));
  if (options) {
    return (
      <label>
        {field}
        <select
          aria-label={field}
          value={other ? "__other__" : value}
          onChange={event => {
            if (event.target.value === "__other__") {
              setOther(true);
              return;
            }
            setOther(false);
            onChange(event.target.value);
          }}
        >
          <option value="">—</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
          <option value="__other__">другое…</option>
        </select>
        {other && <input aria-label={`${field}: другое`} value={value} onChange={event => onChange(event.target.value)} />}
      </label>
    );
  }
  if (LONG_FIELDS.includes(field)) {
    return <label>{field}<textarea value={value} onChange={event => onChange(event.target.value)} /></label>;
  }
  return <label>{field}<input value={value} onChange={event => onChange(event.target.value)} /></label>;
}

export function EditModal({ lead, headers, leads, draft, saving, onChange, onClose, onSave }) {
  const groups = editGroupsFor(headers);
  return (
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="settings-modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <div className="modal-heading">
          <div>
            <h2 id="edit-title">Изменить лида № {lead.id}</h2>
            <p>Изменённые поля запишутся в строку {lead.rowNumber} листа «{SHEET_NAME}».</p>
          </div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={saving}><Icon name="close" /></button>
        </div>
        <div className="edit-groups">
          {groups.map(group => (
            <fieldset key={group.id} disabled={saving}>
              <legend>{group.title}</legend>
              <div className="edit-fields">
                {group.fields.map(field => (
                  <EditField
                    key={field}
                    field={field}
                    value={draft[field] ?? ""}
                    options={SELECT_FIELDS.includes(field) ? uniqueValues(leads, field) : null}
                    onChange={value => onChange(field, value)}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="edit-footer">
          <span>Перед записью CRM проверит, что строка и изменяемые ячейки остались прежними.</span>
          <div>
            <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>Отмена</button>
            <button type="button" className={saving ? "primary-btn is-loading" : "primary-btn"} onClick={onSave} disabled={saving}>{saving ? "Сохранение…" : "Сохранить в Google Таблице"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
