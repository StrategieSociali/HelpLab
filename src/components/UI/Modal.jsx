// src/components/UI/Modal.jsx
/**
 * Modal.jsx
 * ---------
 * Finestra modale condivisa: lo standard grafico delle modali (decisione PM 17/9/2026),
 * estratto da EventConsentModal.jsx. Le modali nuove si costruiscono su questo.
 *
 * ASPETTO: sfondo scuro semitrasparente, card `glass` centrata (max 480px), titolo
 * `dynamic-title`. Il contenuto (testo, errori in `card-info error`, azioni in
 * `dynamic-actions`) lo passa chi usa la modale, come children.
 *
 * PROPS:
 *   title    {ReactNode} - Titolo della finestra (riceve il focus all'apertura)
 *   onClose  {Function}  - Chiusura: Esc e clic fuori la chiamano
 *   children {ReactNode} - Contenuto sotto il titolo
 *
 * ACCESSIBILITÀ:
 * - role="dialog" + aria-modal + aria-labelledby
 * - Focus sul titolo all'apertura; Tab e Maiusc+Tab restano dentro la finestra
 * - Alla chiusura il focus torna dove era prima dell'apertura
 * - ESC e clic sullo sfondo chiudono
 * - Contenuto più alto dello schermo: la card scorre, la pagina sotto no
 */

import React, { useEffect, useId, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, onClose, children }) {
  const titleId  = useId();
  const titleRef = useRef(null);
  const cardRef  = useRef(null);

  // Focus sul titolo all'apertura; alla chiusura torna all'elemento di partenza
  useEffect(() => {
    const previous = document.activeElement;
    titleRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  // ESC chiude; Tab gira dentro la finestra
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const items = [...cardRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first  = items[0];
      const last   = items[items.length - 1];
      const inside = cardRef.current.contains(document.activeElement);
      const onTitle = document.activeElement === titleRef.current;
      if (e.shiftKey && (!inside || onTitle || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          zIndex: 1000,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          ref={cardRef}
          className="card glass"
          style={{
            pointerEvents: "all",
            width: "100%",
            maxWidth: 480,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
          // Impedisce che il click sul modal chiuda l'overlay
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id={titleId}
            className="dynamic-title"
            ref={titleRef}
            tabIndex={-1}
            style={{ outline: "none", marginBottom: 0 }}
          >
            {title}
          </h2>

          {children}
        </div>
      </div>
    </>
  );
}
