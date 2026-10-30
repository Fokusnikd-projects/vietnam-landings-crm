import { hasSourceColumn, leadsWord, optionCounts, toggleValue } from "../data.js";
import { Icon } from "./icons.jsx";

const CHIP_GROUPS = [
  ["niches", "Ниша", "Ниша"],
  ["fits", "Fit", "Fit"],
  ["tourists", "Туристы", "Туристы"],
  ["batches", "Партия", "Партия"],
  ["channels", "Канал интервью", "Интервью: канал"],
  ["readiness", "Готовность", "Готовность"],
];

function ChipGroup({ title, field, viewKey, leads, view, onChange }) {
  const options = optionCounts(leads, field);
  return (
    <section>
      <h3>{title}</h3>
      {options.length ? (
        <div className="chip-row">
          {options.map(item => {
            const selected = view[viewKey].includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                className={selected ? "chip selected" : "chip"}
                aria-pressed={selected}
                onClick={() => onChange({ ...view, [viewKey]: toggleValue(view[viewKey], item.value) })}
              >
                {item.label} <small>{item.count}</small>
              </button>
            );
          })}
        </div>
      ) : <p className="muted">Нет значений</p>}
    </section>
  );
}

export function FilterSheet({ leads, view, resultCount, onChange, onClose }) {
  const districts = optionCounts(leads, "Район");
  const reset = () => onChange({
    ...view,
    districts: [],
    niches: [],
    fits: [],
    tourists: [],
    batches: [],
    channels: [],
    readiness: [],
    sources: [],
  });
  return (
    <div className="sheet-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="bottom-sheet filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <h2 id="filter-title">Фильтры</h2>
          <button type="button" className="icon-button" aria-label="Закрыть фильтры" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="sheet-body">
        <section>
          <h3>Район</h3>
          {districts.length ? districts.map(item => (
            <label key={item.value} className="check-line">
              <input
                type="checkbox"
                checked={view.districts.includes(item.value)}
                onChange={() => onChange({ ...view, districts: toggleValue(view.districts, item.value) })}
              />
              <span>{item.label}</span>
              <small>{item.count}</small>
            </label>
          )) : <p className="muted">Нет районов</p>}
        </section>
        {CHIP_GROUPS.map(([viewKey, title, field]) => (
          <ChipGroup key={viewKey} title={title} field={field} viewKey={viewKey} leads={leads} view={view} onChange={onChange} />
        ))}
        {hasSourceColumn(leads) && (
          <ChipGroup title="Источник" field="Источник" viewKey="sources" leads={leads} view={view} onChange={onChange} />
        )}
        </div>
        <div className="sheet-footer">
          <button type="button" className="secondary-btn" onClick={reset}>Сбросить</button>
          <button type="button" className="brand-btn" onClick={onClose}>Показать {resultCount} {leadsWord(resultCount)}</button>
        </div>
      </section>
    </div>
  );
}
