import React, { useState, useEffect, useCallback, useContext } from 'react';
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

  // Recupera i percorsi di apprendimento
  const fetchLearningPaths = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/learning-paths`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setPaths(response.data);
    } catch (error) {
      console.error('Errore nel recupero dei percorsi:', error);
      setError("Errore nel caricamento dei percorsi. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  }, [navigate, user]);

  // Recupera il progresso utente
  const fetchUserProgress = useCallback(async () => {
    if (!user) return;

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/learning-paths/progress`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUserProgress(response.data);
    } catch (error) {
      console.error('Errore nel recupero del progresso:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchLearningPaths();
    fetchUserProgress();
  }, [fetchLearningPaths, fetchUserProgress]);

  // Aggiorna il progresso di un modulo
  const updateProgress = async (pathId, moduleId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/learning-paths/${pathId}/progress`,
        { moduleId },
        { headers: { Authorization: `Bearer ${user.token}` } }
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
      ) : paths.length === 0 ? (
        <p>Nessun percorso disponibile.</p>
      ) : (
        paths.map((path) => (
          <div key={path.id}>
            <h3>{path.title}</h3>
            <p>{path.description}</p>
            <ul>
              {path.modules.map((module) => (
                <li key={module.id}>
                  {module.title}
                  {userProgress[path.id] && userProgress[path.id].includes(module.id) ? (
                    <span> ✅</span>
                  ) : (
                    <button onClick={() => updateProgress(path.id, module.id)}>Completa</button>
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
