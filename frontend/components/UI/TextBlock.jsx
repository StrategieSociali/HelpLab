// src/components/UI/TextBlock.jsx
import React from "react";

export default function TextBlock({ children, className = "" }) {
  return (
    <p className={`page-text-block ${className}`.trim()}>
      {children}
    </p>
  );
}

