// frontend/src/pages/JoinHelpLab.js
import React from "react";
import GreenSparkForm from "../components/GreenSparkForm";
import "../styles/styles.css";
import FormNotice from "@/components/common/FormNotice.jsx";

export default function JoinHelpLab() {
  return (
    <div className="greenspark-page">
      <section className="hero">
        
      </section>

      <section className="form-section">
  <div className="container">
    <FormNotice className="notice--center" />
    <GreenSparkForm />
  </div>
</section>

    </div>
  );
}

