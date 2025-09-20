import React from "react";

export default function FormNotice({ className = "" }) {
  return (
    <div
      className={`notice notice--info ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="notice__icon" aria-hidden="true"></span>
      <div className="notice__content">
       <p> <strong>Registrati</strong> oggi stesso. <br /></p>
        Per seguire lo sviluppo visita
        {" "}
        <a
          href="https://github.com/StrategieSociali/HelpLab"
          target="_blank"
          rel="noopener noreferrer"
        >
          <em>HelpLab </em> 
        </a>
         su GitHub oppure unisciti al gruppo Telegram
        {" "}
        <a
          href="https://t.me/+h_Rh9IpYpgZjZjc0"
          target="_blank"
          rel="noopener noreferrer"
        >
          @HelpLab
        </a>
        .
      </div>
    </div>
  );
}

