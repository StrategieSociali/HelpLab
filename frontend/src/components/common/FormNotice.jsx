import React from "react";
import TextBlock from "@/components/UI/TextBlock.jsx";

export default function FormNotice({ className = "" }) {
  return (
    <div
      className={`notice notice--info ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="notice__icon" aria-hidden="true"></span>
      <div className="notice__content">
       <TextBlock>Registrati oggi stesso. Per seguire lo sviluppo visita</TextBlock>
       {" "}
      <a
          href="https://github.com/StrategieSociali/HelpLab"
          target="_blank"
          rel="noopener noreferrer"
        >
           <TextBlock>HelpLab su GitHub </TextBlock>
        </a>
        {" "}
        <a
          href="https://t.me/+h_Rh9IpYpgZjZjc0"
          target="_blank"
          rel="noopener noreferrer"
        >
         <TextBlock>HelpLab@Telegram</TextBlock>
        </a>
      </div>
    </div>
  );
}

