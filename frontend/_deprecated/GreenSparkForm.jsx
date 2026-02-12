// GreenSparkForm.jsx
// Struttura unificata con il Login: registration-section -> container -> registration-form

import React, { useState } from "react";
import { submitGreenSparkForm } from "../api/greenspark";

export default function GreenSparkForm() {
  // Stato del form (come nel tuo file)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    interests: "",
    newsletter: false,
  });

  // Messaggio di esito (success/errore)
  const [message, setMessage] = useState(null);

  // Gestione campi (supporta checkbox)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Submit (chiama API, reset se success)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const response = await submitGreenSparkForm(formData);
    setMessage(response.message);
    if (response.success) {
      setFormData({ name: "", email: "", interests: "", newsletter: false });
    }
  };

  return (
    <section className="registration-section">
      <div className="container">
        <form onSubmit={handleSubmit} className="registration-form">
          {/* Nome */}
          <div className="form-group">
            <label htmlFor="name">Nome Completo</label>
            <input
              id="name"
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Aree di interesse (con placeholder disabilitato) */}
          <div className="form-group">
            <label htmlFor="interests">Aree di Interesse</label>
            <select
              id="interests"
              name="interests"
              required
              value={formData.interests}
              onChange={handleChange}
            >
              <option value="" disabled hidden>
                Seleziona un'area
              </option>
              <option value="Energia Rinnovabile">Energia Rinnovabile</option>
              <option value="Riduzione dei Rifiuti">Riduzione dei Rifiuti</option>
              <option value="Agricoltura Sostenibile">Agricoltura Sostenibile</option>
              <option value="Tecnologie Verdi">Tecnologie Verdi</option>
              <option value="Educazione Ambientale">Educazione Ambientale</option>
            </select>
          </div>

          {/* Newsletter (checkbox) */}
          <div className="form-group">
            <label className="checkbox">
              <input
                type="checkbox"
                name="newsletter"
                checked={formData.newsletter}
                onChange={handleChange}
              />
              {' '}Iscriviti alla newsletter
            </label>
          </div>

          {/* CTA */}
          <button type="submit" className="submit-button">
            Unisciti alla Community
          </button>

          {/* Messaggi uniformati */}
          {message && (
            <div className="form-message" role="status">
              {message}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

