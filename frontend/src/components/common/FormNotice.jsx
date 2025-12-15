// src/components/common/FormNotice.jsx
import React from "react";
import TextBlock from "@/components/UI/TextBlock.jsx";
import { useTranslation } from "react-i18next";

export default function FormNotice({ className = "" }) {
const { t } = useTranslation("components/common/formnotice");
  return (
    <div
      className={`notice notice--info ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="notice__icon" aria-hidden="true"></span>
      <div className="notice__content">
         <TextBlock>{t("form_header")}</TextBlock>
       {" "}
      <a
          href="https://github.com/StrategieSociali/HelpLab"
          target="_blank"
          rel="noopener noreferrer"
        >
           <TextBlock>{t("github")}</TextBlock>
        </a>
        {" "}
        <a
          href="https://t.me/+h_Rh9IpYpgZjZjc0"
          target="_blank"
          rel="noopener noreferrer"
        >
         <TextBlock>{t("telegram")}</TextBlock>
        </a>
      </div>
    </div>
  );
}

