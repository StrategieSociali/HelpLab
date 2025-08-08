import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/styles.css'; // se il tuo CSS è lì

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
