import { fitClass, hasTourists, ratingLine, stageKey } from "../data.js";
import { QuickActions } from "./ContactBar.jsx";

function LeadRow({ lead, selected, noted, onOpen, onZalo }) {
  const place = [lead["Район"], lead["Ниша"]].filter(Boolean).join(" · ");
  const rating = ratingLine(lead);
  return (
    <article className={selected ? "lead-row selected" : "lead-row"}>
      <button type="button" className="lead-open" onClick={() => onOpen(lead.id)}>
        <span className="lead-name">{lead["Название"] || "Без названия"}</span>
        <span className="lead-meta">
          <span className="lead-place">{place || "Район не указан"}</span>
          {rating && <span className="lead-rating">{rating}</span>}
        </span>
        <span className="lead-tags">
          <span className={fitClass(lead.Fit)}>{lead.Fit || "—"}</span>
          {hasTourists(lead) && <span className="tourist-mark">туристы</span>}
          {noted && <span className="note-mark">заметка</span>}
        </span>
      </button>
      <QuickActions lead={lead} onZalo={onZalo} />
    </article>
  );
}

export function LeadList({ wide, tabs, leads, activeStage, selectedId, notes, onOpen, onZalo, showClosed }) {
  const columns = tabs.filter(tab => tab.kind !== "closed" || showClosed || activeStage === "closed");
  if (!wide) {
    const visible = leads.filter(lead => stageKey(lead.stage) === activeStage);
    return (
      <div className="mobile-list" aria-label="Список лидов">
        {visible.length ? visible.map(lead => (
          <LeadRow key={lead.id} lead={lead} selected={selectedId === lead.id} noted={Boolean(notes[lead.id]?.text?.trim())} onOpen={onOpen} onZalo={onZalo} />
        )) : <p className="empty-column">В этой стадии нет лидов</p>}
      </div>
    );
  }
  return (
    <div className="board" aria-label="Стадии лидов">
      {columns.map((tab, index) => {
        const rows = leads.filter(lead => stageKey(lead.stage) === tab.key);
        const tone = tab.kind === "check" ? "tone-check" : tab.kind === "closed" ? "tone-closed" : `tone-${index % 4}`;
        return (
          <section key={tab.key} className={`board-column ${tone} ${activeStage === tab.key ? "active" : ""}`}>
            <div className="column-heading">
              <h2>{tab.label}</h2>
              <span className="count">{tab.count}</span>
            </div>
            <div className="column-body">
              {rows.length ? rows.map(lead => (
                <LeadRow key={lead.id} lead={lead} selected={selectedId === lead.id} noted={Boolean(notes[lead.id]?.text?.trim())} onOpen={onOpen} onZalo={onZalo} />
              )) : <p className="empty-column">Пока пусто</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
