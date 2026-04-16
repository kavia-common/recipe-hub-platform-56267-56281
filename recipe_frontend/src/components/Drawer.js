import React, { useEffect } from "react";

// PUBLIC_INTERFACE
export default function Drawer({ title, open, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="rh-drawerOverlay" role="dialog" aria-modal="true" aria-label={title || "Drawer"}>
      <button className="rh-drawerOverlay__backdrop" onClick={onClose} aria-label="Close drawer" type="button" />
      <section className="rh-drawer">
        <header className="rh-drawer__header">
          <div className="rh-drawer__title">{title}</div>
          <button className="rh-btn rh-btn--ghost" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <div className="rh-drawer__body">{children}</div>
        {footer ? <footer className="rh-drawer__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
