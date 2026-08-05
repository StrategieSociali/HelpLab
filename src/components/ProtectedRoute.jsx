// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Guardia di rotta: verifica prima l'autenticazione, poi il RUOLO.
 *
 * Fino alla 1.15.13 il controllo di ruolo NON esisteva: il componente leggeva
 * solo `children`, quindi le prop `allowedRoles={[...]}` scritte in App.jsx su
 * ~15 rotte (7 delle quali solo-admin) venivano scartate in silenzio da React e
 * qualunque utente autenticato poteva aprire le pagine di amministrazione.
 * Il backend restava l'unica difesa reale. (bug #4)
 *
 * Sono accettate entrambe le firme presenti nel codice:
 *   <ProtectedRoute allowedRoles={['judge','admin']}>   (convenzione dominante)
 *   <ProtectedRoute role="admin">                       (solo EventReport)
 */
function ProtectedRoute({ children, allowedRoles, role }) {
  const { isAuthenticated, loading, role: userRole } = useAuth();
  const location = useLocation();

  // Mentre verifichiamo la sessione (ripristino token / refresh)
  if (loading) {
    return <div>Caricamento in corso…</div>;
  }

  // Se non autenticato, vai al login e conserva da dove venivi
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Normalizza le due firme in un unico elenco di ruoli ammessi
  const required = allowedRoles ?? (role ? [role] : null);

  // Se il ruolo NON è noto (in `/auth/me` è `string | null`) non blocchiamo qui:
  // decide il backend, che è comunque la difesa reale. Bloccare su ruolo ignoto
  // chiuderebbe fuori da ogni pagina un utente con `role: null` legittimo.
  const roleIsKnown = !!userRole;

  // Ruolo noto e non ammesso → messaggio esplicito, MAI un vicolo cieco:
  // un redirect silenzioso qui farebbe sembrare l'app rotta.
  if (required && roleIsKnown && !required.includes(userRole)) {
    return (
      // `color` esplicito: senza, il testo eredita un colore scuro e su queste
      // pagine a fondo scuro risultava illeggibile (segnalato dal PM il 5/8).
      <div
        className="page-section page-text"
        style={{
          padding: '2rem',
          maxWidth: 640,
          margin: '0 auto',
          textAlign: 'center',
          color: '#ffffff',
        }}
      >
        <h2>Questa pagina non è disponibile per il tuo profilo</h2>
        <p>
          Per accedervi serve un profilo diverso da quello con cui hai effettuato
          l'accesso. Se pensi che si tratti di un errore, contatta l'organizzazione.
        </p>
        <p style={{ marginTop: 16 }}>
          {/* Pulsante e non link testuale: su fondo scuro il colore dei link
              visitati diventa illeggibile (stesso motivo del pulsante risultati). */}
          <Link to="/" className="btn btn-outline">
            Torna alla home
          </Link>
        </p>
      </div>
    );
  }

  // Autenticato e con il ruolo giusto
  return <>{children}</>;
}

export default ProtectedRoute;