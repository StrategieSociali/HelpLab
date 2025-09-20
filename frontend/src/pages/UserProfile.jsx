import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function UserProfile() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <section className="page-section page-text"><div className="container">Caricamento…</div></section>
    );
  }

  if (!user) {
    return (
      <section className="page-section page-text"><div className="container">Non sei loggato.</div></section>
    );
  }

  return (
    <section className="page-section page-text">
      <div className="container">
        <h2 className="page-title">Profilo</h2>
        <div className="card" style={{ padding: 16 }}>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          {user.username && <p><strong>Username:</strong> {user.username}</p>}
          <button className="btn btn-outline" onClick={logout}>Logout</button>
        </div>
      </div>
    </section>
  );
}

