// Register.jsx
// Obiettivo: stesso layout/stile dei form unificati (registration-section → container → registration-form)
// NOTA: non cambiamo la logica originale; solo markup + classi per ereditare gli stili esistenti.

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FormNotice from "@/components/common/FormNotice.jsx";

function Register() {
  // Stato del form: identico alla tua base
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Errori da mostrare all’utente (coerenti con .form-message)
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Aggiorna lo stato in base al nome del campo (pattern già usato nel tuo file)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit con validazione "password === confirmPassword" (come nel tuo file)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("Demo attiva: questo form non invia ancora i dati. " +
    "Per contribuire cerca HelpLab su GitHub o unisciti al gruppo Telegram @HelpLab.");

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
 // Questa parte va decommentata quando arriva il backend
    //try {
     
      //Chiamata API: manteniamo esattamente l’endpoint/variabile d’ambiente che usavi
      // Se in futuro usi Vite, valuta import.meta.env.VITE_API_URL
      //const response = await axios.post(
      //  `${process.env.REACT_APP_API_URL}/register`,
      //  formData // inviamo lo stesso payload del tuo file originale
    //  );

      // Comportamento di successo: uguale al tuo file
     // alert('Registration successful! Please log in.');
     // navigate('/login');
    // } catch (error) {
      // Gestione errori: mantiene la priorità al messaggio dal server se presente
     // setError(error.response?.data?.message || 'Registration failed.');
    //}
  };

  return (
    // Wrapper scuro + container: stessi elementi usati in Login/GreenSpark
    <section className="registration-section">
      <div className="container">
      {/* Alert FormNotice */}
       <FormNotice />
        {/* Il form assume gli stili vetrosi già presenti nel tuo CSS */}
        <form onSubmit={handleSubmit} className="registration-form">
          {/* Username */}
          <div className="form-group">
            {/* label+htmlFor/id = migliore accessibilità e combacia con i selettori CSS */}
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
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
              autoComplete="new-password"
            />
          </div>

          {/* Conferma Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Conferma Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Messaggio d'errore uniforme (stessa classe del resto dei form) */}
          {error && (
            <div className="form-message error" role="alert">
              {error}
            </div>
          )}

          {/* CTA in stile verde (classe già presente nel tuo CSS) */}
          <button type="submit" className="submit-button">
            Register
          </button>
        </form>
      </div>
    </section>
  );
}

export default Register;

