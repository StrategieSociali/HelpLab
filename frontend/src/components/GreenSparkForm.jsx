// frontend/src/components/GreenSparkForm.js
import React, { useState } from "react";
import { submitGreenSparkForm } from "../api/greenspark";

export default function GreenSparkForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    interests: "",
    newsletter: false,
  });

  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const response = await submitGreenSparkForm(formData);
    setMessage(response.message);
    if (response.success) setFormData({ name: "", email: "", interests: "", newsletter: false });
  };

  return (
    <form onSubmit={handleSubmit} className="greenspark-form">
      <label>
        Nome Completo
        <input type="text" name="name" required value={formData.name} onChange={handleChange} />
      </label>
      <label>
        Email
        <input type="email" name="email" required value={formData.email} onChange={handleChange} />
      </label>
      <label>
        Aree di Interesse
        <select name="interests" required value={formData.interests} onChange={handleChange}>
          <option value="">Seleziona un'area</option>
          <option value="Energia Rinnovabile">Energia Rinnovabile</option>
          <option value="Riduzione dei Rifiuti">Riduzione dei Rifiuti</option>
          <option value="Agricoltura Sostenibile">Agricoltura Sostenibile</option>
          <option value="Tecnologie Verdi">Tecnologie Verdi</option>
          <option value="Educazione Ambientale">Educazione Ambientale</option>
        </select>
      </label>
      <label className="checkbox">
        <input type="checkbox" name="newsletter" checked={formData.newsletter} onChange={handleChange} />
        Iscriviti alla newsletter
      </label>
      <button type="submit">Unisciti alla Community</button>

      {message && <div className="form-message">{message}</div>}
    </form>
  );
}

