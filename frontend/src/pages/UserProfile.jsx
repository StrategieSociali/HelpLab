import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function UserProfile() {
  const [userData, setUserData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Recupera il profilo utente
  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setUserData(response.data);
    } catch (error) {
      console.error('Errore nel recupero del profilo:', error);
      setError("Errore nel caricamento del profilo utente.");
    } finally {
      setLoading(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Gestione input modifiche profilo
  const handleInputChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  // Salvataggio modifiche profilo
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/user/profile`, userData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setIsEditing(false);
      alert('Profilo aggiornato con successo!');
      fetchUserProfile();
    } catch (error) {
      console.error('Errore nell\'aggiornamento del profilo:', error);
      setError("Errore nell'aggiornamento del profilo. Riprova.");
    }
  };

  if (loading) {
    return <p>Caricamento profilo...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Profilo Utente</h2>
      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            value={userData.username || ''}
            onChange={handleInputChange}
            placeholder="Username"
          />
          <input
            type="email"
            name="email"
            value={userData.email || ''}
            onChange={handleInputChange}
            placeholder="Email"
          />
          <button type="submit">Salva Modifiche</button>
          <button type="button" onClick={() => setIsEditing(false)}>Annulla</button>
        </form>
      ) : (
        <>
          <p>Username: {userData.username}</p>
          <p>Email: {userData.email}</p>
          <p>Ruolo: {userData.role}</p>
          {userData.createdAt && <p>Membro dal: {new Date(userData.createdAt).toLocaleDateString()}</p>}
          {userData.updatedAt && <p>Ultimo aggiornamento: {new Date(userData.updatedAt).toLocaleDateString()}</p>}
          <button onClick={() => setIsEditing(true)}>Modifica Profilo</button>
        </>
      )}
    </div>
  );
}

export default UserProfile;
