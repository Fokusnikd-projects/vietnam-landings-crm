import { Icon } from "./icons.jsx";

const ACTIONS = [
  { key: "call", label: "Позвонить", icon: "phone", hrefKey: "telHref" },
  { key: "zalo", label: "Zalo", icon: "zalo", hrefKey: "zaloHref", action: "zalo" },
  { key: "whatsapp", label: "WhatsApp", icon: "whatsapp", hrefKey: "waHref", action: "whatsapp" },
  { key: "maps", label: "Maps", icon: "map", hrefKey: "mapsHref" },
  { key: "facebook", label: "Facebook", icon: "facebook", hrefKey: "fbHref" },
];

export function ContactBar({ lead, onZalo, onWhatsApp }) {
  return (
    <div className="contact-bar" role="toolbar" aria-label="Связаться">
      {ACTIONS.map(item => {
        const href = lead.contacts?.[item.hrefKey] || "";
        const disabled = !href;
        if (item.action === "zalo" || item.action === "whatsapp") {
          return (
            <button
              key={item.key}
              type="button"
              className="contact-btn"
              disabled={disabled}
              onClick={() => (item.action === "zalo" ? onZalo(lead) : onWhatsApp(lead))}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          );
        }
        if (disabled) {
          return <button key={item.key} type="button" className="contact-btn" disabled><Icon name={item.icon} />{item.label}</button>;
        }
        return (
          <a
            key={item.key}
            className="contact-btn"
            href={href}
            target={item.key === "call" ? undefined : "_blank"}
            rel={item.key === "call" ? undefined : "noreferrer"}
          >
            <Icon name={item.icon} />
            {item.label}
          </a>
        );
      })}
    </div>
  );
}

export function QuickActions({ lead, onZalo }) {
  const call = lead.contacts?.telHref;
  const zalo = lead.contacts?.zaloHref;
  const maps = lead.contacts?.mapsHref;
  return (
    <div className="quick-actions">
      {call ? <a className="quick-btn" href={call} aria-label={`Позвонить: ${lead["Название"]}`}><Icon name="phone" /></a> : <button type="button" className="quick-btn" disabled aria-label={`Позвонить: ${lead["Название"]}`}><Icon name="phone" /></button>}
      <button type="button" className="quick-btn" disabled={!zalo} aria-label={`Zalo: ${lead["Название"]}`} onClick={() => onZalo(lead)}><Icon name="zalo" /></button>
      {maps ? <a className="quick-btn" href={maps} target="_blank" rel="noreferrer" aria-label={`Maps: ${lead["Название"]}`}><Icon name="map" /></a> : <button type="button" className="quick-btn" disabled aria-label={`Maps: ${lead["Название"]}`}><Icon name="map" /></button>}
    </div>
  );
}
