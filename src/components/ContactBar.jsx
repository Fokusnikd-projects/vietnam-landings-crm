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
              className={disabled ? "contact-btn is-disabled" : "contact-btn"}
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => (item.action === "zalo" ? onZalo(lead) : onWhatsApp(lead))}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          );
        }
        if (disabled) {
          return <button key={item.key} type="button" className="contact-btn is-disabled" disabled aria-disabled="true"><Icon name={item.icon} />{item.label}</button>;
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

function Action({ href, label, className, children, onClick = undefined }) {
  if (!href) {
    return <button type="button" className={`${className} is-disabled`} disabled aria-disabled="true" aria-label={label}>{children}</button>;
  }
  if (onClick) {
    return <button type="button" className={className} aria-label={label} onClick={onClick}>{children}</button>;
  }
  const external = !String(href).startsWith("tel:");
  return <a className={className} href={href} aria-label={label} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}</a>;
}

export function QuickActions({ lead, onZalo }) {
  const name = lead["Название"] || "лид";
  return (
    <div className="quick-actions">
      <Action className="quick-btn" href={lead.contacts?.telHref} label={`Позвонить, ${name}`}><Icon name="phone" /></Action>
      <Action className="quick-btn zalo-btn" href={lead.contacts?.zaloHref} label={`Написать в Zalo, ${name}`} onClick={() => onZalo(lead)}>Zalo</Action>
      <Action className="quick-btn" href={lead.contacts?.mapsHref} label={`Открыть карту, ${name}`}><Icon name="map" /></Action>
    </div>
  );
}
