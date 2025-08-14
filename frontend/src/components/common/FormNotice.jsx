import React from "react";

export default function FormNotice({ className = "" }) {
  return (
    <div
      className={`notice notice--info ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="notice__icon" aria-hidden="true">ℹ️</span>
      <div className="notice__content">
        <strong>Demo:</strong> questo form è dimostrativo e al momento non è attivo. <br />
        Per restare informato o contribuire, cerca 
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

