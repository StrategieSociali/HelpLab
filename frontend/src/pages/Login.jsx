// Login.jsx
// Scopo: rendere il form di Login graficamente identico al GreenSparkForm
// mantenendo il tuo comportamento originale (stato, alert, navigate).
//
// Come: applichiamo la stessa struttura e classi CSS del GreenSpark:
// - <form className="greenspark-form">  --> aggancia gli stili del form
// - <label> che avvolgono gli <input>   --> tipico pattern del GreenSpark
// - <div className="form-message">      --> area messaggi coerente con GreenSpark
//
// Importante: questo file NON introduce nuovi stili. Presuppone che nel progetto
// esista già il CSS che definisce .greenspark-form e affini. Quando è importato
// (globalmente o per componente), il login eredita lo stesso look & feel.
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormNotice from "@/components/common/FormNotice.jsx";

function Login() {
// Stato del form:
  const [formData, setFormData] = useState({ username: '', password: '' });
  // Stato per mostrare eventuali errori:
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

// Gestione change: (spread + property name dinamico)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

// Gestione submit: incluso alert e navigate
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // azzera errori precedenti
    try {
    // tenta il login con i dati inseriti
      await login(formData.username, formData.password);
      // Manteniamo il tuo alert di successo
      alert('Login successful!');
       // e navighiamo alla dashboard
      navigate('/dashboard');
    } catch (error) {
      setError(error || 'Login failed. Try again.');
    }
  };

return (
  // Wrapper scuro: è quello che dà il background a contrasto
  <section className="registration-section">
    <div className="container">
    <FormNotice />
      
      <form onSubmit={handleSubmit} className="registration-form">
        
        {/* Struttura prevista dal CSS: blocchi .form-group con label + input */}
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"                     // collega la label
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
        </div>

        {/* Messaggio di errore: tieni pure il tuo inline per ora */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Bottone con stile verde come il form della landing */}
        <button type="submit" className="submit-button">Login</button>
      </form>
    </div>
  </section>
);

}

export default Login;
