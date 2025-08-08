// frontend/src/pages/JoinHelpLab.js
import React from "react";
import GreenSparkForm from "../components/GreenSparkForm";
import "../styles/styles.css";

export default function JoinHelpLab() {
  return (
    <div className="greenspark-page">
      <section className="hero">
        <h1>Unisciti a HelpLab</h1>
        <p>
          Insieme possiamo creare un impatto positivo duraturo per le generazioni future.
          Partecipa attivamente alla nostra comunità!
        </p>
      </section>

      <section className="form-section">
        <GreenSparkForm />
      </section>
    </div>
  );
}

