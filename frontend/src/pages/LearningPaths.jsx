// axios.get/post: completare questa parte a valle del backend: gestire 401/403 e mapping errori lato API
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function LearningPaths() {
  const [paths, setPaths] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const API_URL = import.meta.env.VITE_API_URL;  // completare questa parte a valle del backend: definire VITE_API_URL in .env

  // Ricerca e filtri locali (no backend)
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');          // '', 'base', 'intermedio', 'avanzato'
  const [sortBy, setSortBy] = useState('recent');  // 'recent' | 'title' | 'duration'

  // Tronca descrizioni lunghe per la card
  const short = (text = '', max = 160) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

  // Calcola progresso singolo corso
  const progressInfo = (p) => {
    const completed = Array.isArray(p) ? p.length : 0;
    return { completed };
  };

  // Usa l'header Authorization solo se il token esiste
  const authHeaders = user?.token ? { Authorization: `Bearer ${user.token}` } : {};

  // Recupera i percorsi di apprendimento
  // completare questa parte a valle del backend: definire endpoint e payload attesi per /learning-paths
  const fetchLearningPaths = useCallback(async () => {
   // completare questa parte a valle del backend: se l'endpoint /learning-paths richiede auth,
  // ripristinare il redirect qui sotto.
  // if (!user) {
  //   navigate('/login');
  //   return;
  // }

  // vista pubblica: permettiamo il fetch senza token (authHeaders è vuoto se non loggati)
  // ...
  setLoading(true);
  setError('');
  try {
    const response = await axios.get(`${API_URL}/learning-paths`, {
      headers: authHeaders,
    });
    setPaths(Array.isArray(response.data) ? response.data : []);
  } catch (error) {
    console.error('Errore nel recupero dei percorsi:', error);
    setError("Errore nel caricamento dei percorsi. Riprova più tardi.");
  } finally {
    setLoading(false);
  }
  }, [navigate, user, API_URL, authHeaders]);

  // Recupera il progresso utente
  // completare questa parte a valle del backend: definire schema di risposta per /learning-paths/progress
  const fetchUserProgress = useCallback(async () => {
    if (!user) return;

    try {
      const response = await axios.get(`${API_URL}/learning-paths/progress`, {
        headers: authHeaders,
      });
      setUserProgress(response.data);
    } catch (error) {
      console.error('Errore nel recupero del progresso:', error);
    }
  }, [user, API_URL, authHeaders]);

  useEffect(() => {
    fetchLearningPaths();
    fetchUserProgress();
  }, [fetchLearningPaths, fetchUserProgress]);

  // ---- FILTRI/ORDINAMENTO DERIVATI (punto 4) ----
  // completare questa parte a valle del backend: popolare 'level', 'estimatedMinutes', 'updatedAt'/'createdAt' nei dati dei corsi
  const filteredPaths = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = Array.isArray(paths) ? [...paths] : [];

    // filtro testo
    if (q) {
      list = list.filter((p) => {
        const hay = [p.title, p.description, ...(p.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // filtro livello (se disponibile nei dati)
    if (level) {
      list = list.filter((p) => (p.level || '').toLowerCase() === level);
    }

    // ordinamento
    list.sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'duration') return (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da; // recenti prima
    });

    return list;
  }, [paths, query, level, sortBy]);
  // -----------------------------------------------

  // Aggiorna il progresso di un modulo
  // completare questa parte a valle del backend: verificare payload e codici di risposta di POST /learning-paths/:id/progress
  const updateProgress = async (pathId, moduleId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/learning-paths/${pathId}/progress`,
        { moduleId },
        { headers: authHeaders }
      );
      fetchUserProgress(); // Aggiorna il progresso dopo il completamento
    } catch (error) {
      console.error('Errore aggiornamento progresso:', error.response?.data || error.message);
      alert("Errore nell'aggiornamento del progresso. Riprova.");
    }
  };

  return (
    <div>
      <h2>Percorsi di Apprendimento</h2>

      {loading ? (
        <p>Caricamento...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : filteredPaths.length === 0 ? (
        <p>Nessun percorso disponibile.</p>
      ) : (
        filteredPaths.map((path) => (
          <div key={path.id}>
            <h3>{path.title}</h3>
            <p>{short(path.description)}</p>
            <ul>
              {(path.modules || []).map((module) => (
                <li key={module.id}>
                  {module.title}
                  {userProgress[path.id] && userProgress[path.id].includes(module.id) ? (
                  <span> ✅</span>
                 ) : user ? (
               <button onClick={() => updateProgress(path.id, module.id)}>Completa</button>
               ) : (
               // completare questa parte a valle del backend: eventuale modal/redirect login dedicato
               <button onClick={() => navigate('/login')}>Accedi per completare</button>
                )}

                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

export default LearningPaths;

