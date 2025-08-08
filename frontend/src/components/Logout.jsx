import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Logout() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    alert('Logout successful.');
    navigate('/login');
  };

  return <button onClick={handleLogout}>Logout</button>;
}

export default Logout;

