const graphics = {
  search: <><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></>,
  leads: <><path d="M8 7h11M8 12h11M8 17h7" /><path d="M4 7h.01M4 12h.01M4 17h.01" /></>,
  notes: <><path d="M7 4h8l4 4v12H7z" /><path d="M15 4v4h4M9 13h6M9 17h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.2-5.5" /><path d="M20 4v5h-5" /></>,
  link: <><path d="M10 14l4-4" /><path d="M9 15l-1.5 1.5a3.5 3.5 0 0 1-5-5L4 10" /><path d="M15 9l1.5-1.5a3.5 3.5 0 0 1 5 5L20 14" /></>,
  phone: <path d="M8 4h3l1 4-2 1a12 12 0 0 0 5 5l1-2 4 1v3c0 1-1 2-2 2C10 18 6 8 6 6c0-1 1-2 2-2z" />,
  copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M5 15V5h10" /></>,
  save: <path d="M5 5h11l3 3v11H5zM8 5v5h6M8 19v-5h8v5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  upload: <path d="M12 16V6m0 0 4 4m-4-4-4 4M5 19h14" />,
  download: <path d="M12 5v10m0 0 4-4m-4 4-4-4M5 19h14" />,
  map: <><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" /><circle cx="12" cy="11" r="2" /></>,
  edit: <path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4" />,
  filter: <path d="M4 6h16l-6 7v5l-4 2v-7z" />,
  zalo: <path d="M7 17l-2 3V6h14v11z" />,
  whatsapp: <path d="M6 18l-1 3 3-1a8 8 0 1 0-2-2z" />,
  facebook: <path d="M14 8h3V4h-3c-2 0-4 2-4 4v2H8v4h2v6h4v-6h3l1-4h-4V8c0-.6.4-1 1-1z" />,
  back: <path d="M15 5 8 12l7 7" />,
};

export function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {graphics[name] || null}
    </svg>
  );
}
