// src/pages/organizations/OrganizationPage.jsx
/**
 * Scopo: pagina dell'ente per i suoi membri (8a, passo 2, scelte 1 e 2-bis).
 *
 * - Profilo: lo vedono i membri attivi e l'admin. Sito, descrizione e logo li
 *   modificano i referenti (e l'admin); il nome no: è quello approvato.
 * - Membri: attivi e inviti in attesa, con il solo nome visibile.
 *   Il referente invita (email o nickname di un utente registrato), annulla un
 *   invito, toglie un membro, cambia i ruoli. Ogni membro può uscire da solo.
 *   L'ultimo referente non si toglie e non si declassa: la regola la fa il BE,
 *   qui si nasconde solo il pulsante che darebbe un rifiuto certo.
 * - Chi non è membro riceve 404 dal BE: qui un unico messaggio «non trovato».
 * - Sfide dell'ente (8a, passo 3): le vedono i membri e l'admin; i referenti (e
 *   l'admin) ne cambiano titolo, luogo, descrizione e scadenza da «Modifica sfida».
 *   Il resto della sfida (tipo, obiettivi, calcolatori, stato) resta all'admin.
 * - Solo admin: assegna all'ente sfide ed eventi che esistono già (es. quelli di
 *   un ente che organizzava prima che gli enti esistessero) e li toglie.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { routes } from "@/routes";
import { useAuth } from "@/context/AuthContext";
import {
  changeMemberRole,
  getOrganization,
  getOrganizationMembers,
  inviteMember,
  removeMember,
  updateOrganization,
  getOrganizationChallenges,
  adminSetChallengeOrganization,
} from "@/api/organizations.api";
import { getAdminEvents, updateEvent } from "@/api/events.api";
import { api, API_PATHS } from "@/api/client";
import "../../styles/dynamic-pages.css";

const beError = (err) => err?.response?.data?.error || null;

function OrgLogo({ url, alt, size = 56 }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (!url || broken) return null;
  return (
    <img
      src={url}
      alt={alt}
      onError={() => setBroken(true)}
      style={{ width: size, height: size, objectFit: "contain", borderRadius: 8, background: "#fff" }}
    />
  );
}

export default function OrganizationPage() {
  const { id } = useParams();
  const { t, ready } = useTranslation("pages/organizations", { useSuspense: false });
  const { user } = useAuth();

  const [org, setOrg] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ website: "", description: "", logo_url: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "success"|"error", text }

  const [identifier, setIdentifier] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyMember, setBusyMember] = useState(null);

  // Sfide dell'ente (8a, passo 3)
  const [challenges, setChallenges] = useState([]);
  const [challengesError, setChallengesError] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await getOrganizationMembers(id));
      setMembersError(false);
    } catch {
      setMembersError(true);
    }
  }, [id]);

  const loadChallenges = useCallback(async () => {
    try {
      setChallenges(await getOrganizationChallenges(id));
      setChallengesError(false);
    } catch {
      setChallengesError(true);
    }
  }, [id]);

  const load = useCallback(async () => {
    setNotFound(false);
    setLoadError(false);
    try {
      setOrg(await getOrganization(id));
      await Promise.all([loadMembers(), loadChallenges()]);
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
      else setLoadError(true);
    }
  }, [id, loadMembers, loadChallenges]);

  useEffect(() => { load(); }, [load]);

  if (!ready) {
    return <section className="page-section page-text"><div className="container">…</div></section>;
  }

  const back = (
    <Link to={routes.dashboard.userProfile} className="btn btn-ghost btn-small">← {t("detail.back")}</Link>
  );

  if (notFound || loadError) {
    return (
      <section className="page-section page-text">
        <div className="container">
          <div className={`callout ${notFound ? "neutral" : "error"}`} style={{ marginBottom: 12 }}>
            {notFound ? t("detail.notFound") : t("common.genericError")}
          </div>
          {back}
        </div>
      </section>
    );
  }

  if (!org) {
    return <section className="page-section page-text"><div className="container">{t("common.loading")}</div></section>;
  }

  const myRole = org.my_role; // null per l'admin che non ne è membro
  const isReferent = myRole === "referent";
  // l'admin modifica il profilo anche senza esserne membro (regola del BE)
  const canEditProfile = isReferent || user?.role === "admin";
  const activeReferents = members.filter((m) => m.status === "active" && m.role === "referent").length;
  const me = members.find((m) => m.is_me && m.status === "active");

  const startEdit = () => {
    setDraft({ website: org.website ?? "", description: org.description ?? "", logo_url: org.logo_url ?? "" });
    setNotice(null);
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const updated = await updateOrganization(id, draft);
      setOrg(updated);
      setEditing(false);
      setNotice({ type: "success", text: t("detail.saved") });
    } catch (err) {
      setNotice({ type: "error", text: beError(err) || t("common.genericError") });
    } finally {
      setSaving(false);
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    const value = identifier.trim();
    if (value.length < 2) return;
    setInviting(true);
    setNotice(null);
    try {
      const res = await inviteMember(id, value);
      setIdentifier("");
      setNotice({ type: "success", text: t("detail.invited", { name: res.name }) });
      await loadMembers();
    } catch (err) {
      setNotice({ type: "error", text: beError(err) || t("common.genericError") });
    } finally {
      setInviting(false);
    }
  };

  const act = async (m, kind) => {
    const confirms = {
      remove: t("detail.removeConfirm", { name: m.name }),
      cancel: t("detail.cancelInviteConfirm", { name: m.name }),
      leave: t("detail.leaveConfirm", { name: org.name }),
      stepDown: t("detail.stepDownConfirm"),
    };
    if (confirms[kind] && !window.confirm(confirms[kind])) return;
    setBusyMember(m.member_id);
    setNotice(null);
    try {
      if (kind === "referent" || kind === "member" || kind === "stepDown") {
        await changeMemberRole(id, m.member_id, kind === "stepDown" ? "member" : kind);
        if (kind === "stepDown") {
          // non più referente: cambiano i pulsanti che vedo, si rilegge anche l'ente
          setOrg(await getOrganization(id));
        }
        await loadMembers();
      } else {
        await removeMember(id, m.member_id);
        if (kind === "leave") {
          // uscito: l'ente per lui non esiste più
          setNotFound(true);
          return;
        }
        await loadMembers();
      }
    } catch (err) {
      setNotice({ type: "error", text: beError(err) || t("common.genericError") });
    } finally {
      setBusyMember(null);
    }
  };

  return (
    <section className="page-section page-text">
      <div className="container" style={{ maxWidth: 860 }}>
        {back}

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0" }}>
          <OrgLogo url={org.logo_url} alt={t("detail.logoPreview")} />
          <div>
            <h2 className="page-title" style={{ margin: 0 }}>{org.name}</h2>
            {myRole && <span className="chip chip-role">{t(`common.roles.${myRole}`)}</span>}
          </div>
        </div>

        {notice && <div className={`callout ${notice.type}`} style={{ marginBottom: 12 }}>{notice.text}</div>}

        {/* ---------------- Profilo ---------------- */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <h3 className="dynamic-title" style={{ margin: 0 }}>{t("detail.profileTitle")}</h3>
            {canEditProfile && !editing && (
              <button className="btn btn-outline btn-small" onClick={startEdit}>{t("detail.edit")}</button>
            )}
          </div>

          {!editing && (
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <div>
                <strong>{t("detail.websiteLabel")}:</strong>{" "}
                {org.website
                  ? <a className="link-accent" href={org.website} target="_blank" rel="noopener noreferrer">{org.website}</a>
                  : <span className="muted">{t("detail.noWebsite")}</span>}
              </div>
              <div>
                <strong>{t("detail.descriptionLabel")}:</strong>{" "}
                {org.description
                  ? <span style={{ whiteSpace: "pre-wrap" }}>{org.description}</span>
                  : <span className="muted">{t("detail.noDescription")}</span>}
              </div>
            </div>
          )}

          {editing && (
            <form onSubmit={save} className="registration-form" style={{ marginTop: 12 }}>
              <p className="small muted">{t("detail.nameNote")}</p>
              <div className="form-group">
                <label htmlFor="org_website">{t("detail.websiteLabel")}</label>
                <input id="org_website" type="url" maxLength={255} placeholder="https://"
                  value={draft.website} onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))} disabled={saving} />
              </div>
              <div className="form-group">
                <label htmlFor="org_description">{t("detail.descriptionLabel")}</label>
                <textarea id="org_description" rows={4} maxLength={5000}
                  value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} disabled={saving} />
              </div>
              <div className="form-group">
                <label htmlFor="org_logo">{t("detail.logoLabel")}</label>
                <input id="org_logo" type="url" maxLength={255} placeholder="https://"
                  value={draft.logo_url} onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value }))} disabled={saving}
                  aria-describedby="org_logo_help" />
                <p id="org_logo_help" className="small muted" style={{ marginTop: 4 }}>{t("detail.logoHelp")}</p>
                <OrgLogo url={draft.logo_url.trim()} alt={t("detail.logoPreview")} size={72} />
              </div>
              <div className="dynamic-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t("detail.saving") : t("detail.save")}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
                  {t("detail.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ---------------- Membri ---------------- */}
        <div className="card" style={{ padding: 16, marginTop: 24 }}>
          <h3 className="dynamic-title" style={{ marginTop: 0 }}>{t("detail.membersTitle")}</h3>
          <p className="muted">{t("detail.membersIntro")}</p>
          {membersError && <div className="callout error">{t("detail.membersLoadError")}</div>}

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {members.map((m) => {
              const lastReferent = m.status === "active" && m.role === "referent" && activeReferents <= 1;
              const busy = busyMember === m.member_id;
              return (
                <li key={m.member_id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <strong>{m.name}</strong>{m.is_me && <span className="muted"> ({t("detail.you")})</span>}{" "}
                    {m.status === "active"
                      ? <span className="chip chip-role" style={{ whiteSpace: "nowrap" }}>{t(`common.roles.${m.role}`)}</span>
                      : <span className="chip chip-warning" style={{ whiteSpace: "nowrap" }}>{t("common.statuses.invited")}</span>}
                    {m.invited_by && <div className="small muted">{t("detail.invitedBy", { name: m.invited_by })}</div>}
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {isReferent && m.status === "active" && m.role === "member" && (
                      <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => act(m, "referent")}>{t("detail.makeReferent")}</button>
                    )}
                    {isReferent && m.status === "active" && m.role === "referent" && !lastReferent && !m.is_me && (
                      <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => act(m, "member")}>{t("detail.makeMember")}</button>
                    )}
                    {/* Il referente lascia il ruolo, se ce n'è un altro: niente referenti a vita */}
                    {isReferent && m.is_me && m.status === "active" && !lastReferent && (
                      <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => act(m, "stepDown")}>{t("detail.stepDown")}</button>
                    )}
                    {isReferent && m.status === "invited" && (
                      <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => act(m, "cancel")}>{t("detail.cancelInvite")}</button>
                    )}
                    {isReferent && m.status === "active" && !m.is_me && !lastReferent && (
                      <button className="btn btn-outline btn-small" disabled={busy} onClick={() => act(m, "remove")}>{t("detail.remove")}</button>
                    )}
                    {m.is_me && m.status === "active" && !lastReferent && (
                      <button className="btn btn-outline btn-small" disabled={busy} onClick={() => act(m, "leave")}>{t("detail.leave")}</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {me && me.role === "referent" && activeReferents <= 1 && (
            <p className="small muted" style={{ marginTop: 10 }}>{t("detail.lastReferentNote")}</p>
          )}

          {isReferent && (
            <form onSubmit={invite} style={{ marginTop: 20 }}>
              <h4 style={{ margin: "0 0 4px" }}>{t("detail.inviteTitle")}</h4>
              <p className="small muted" style={{ marginTop: 0 }}>{t("detail.inviteHelp")}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  className="control"
                  style={{ flex: "1 1 220px" }}
                  maxLength={255}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t("detail.invitePlaceholder")}
                  aria-label={t("detail.invitePlaceholder")}
                  disabled={inviting}
                />
                <button type="submit" className="btn btn-primary" disabled={inviting || identifier.trim().length < 2}>
                  {inviting ? t("detail.inviting") : t("detail.invite")}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ---------------- Sfide dell'ente ---------------- */}
        <div className="card" style={{ padding: 16, marginTop: 24 }}>
          <h3 className="dynamic-title" style={{ marginTop: 0 }}>{t("detail.challengesTitle")}</h3>
          <p className="muted">{isReferent || user?.role === "admin" ? t("detail.challengesIntroReferent") : t("detail.challengesIntroMember")}</p>
          {challengesError && <div className="callout error">{t("detail.challengesLoadError")}</div>}
          {!challengesError && challenges.length === 0 && <p className="muted small">{t("detail.challengesEmpty")}</p>}
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {challenges.map((ch) => (
              <li key={ch.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <strong>{ch.title}</strong>{" "}
                  <span className="chip chip-role" style={{ whiteSpace: "nowrap" }}>{t(`detail.challengeStatus.${ch.status}`, ch.status)}</span>
                  <div className="small muted">
                    {[ch.location, ch.deadline && t("detail.challengeDeadline", { date: new Date(ch.deadline).toLocaleDateString() })].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {ch.can_edit_texts && (
                    <Link className="btn btn-outline btn-small" to={routes.organizations.challengeEdit(id, ch.id)}>{t("detail.challengeEdit")}</Link>
                  )}
                  {user?.role === "admin" && (
                    <AdminUnassignChallenge t={t} challenge={ch} onDone={loadChallenges} onError={(text) => setNotice({ type: "error", text })} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {user?.role === "admin" && (
          <AdminAssignPanel t={t} orgId={id} orgName={org.name} onChallengeAssigned={loadChallenges} setNotice={setNotice} />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Solo admin: togliere una sfida all'ente
// ---------------------------------------------------------------------------
function AdminUnassignChallenge({ t, challenge, onDone, onError }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!window.confirm(t("detail.adminUnassignConfirm", { title: challenge.title }))) return;
    setBusy(true);
    try {
      await adminSetChallengeOrganization(challenge.id, null);
      await onDone();
    } catch (err) {
      onError(beError(err) || t("common.genericError"));
    } finally {
      setBusy(false);
    }
  };
  return <button className="btn btn-ghost btn-small" disabled={busy} onClick={go}>{t("detail.adminUnassign")}</button>;
}

// ---------------------------------------------------------------------------
// Solo admin: assegnare all'ente sfide ed eventi che esistono già
//   - sfide: le 50 più recenti senza ente (l'elenco pubblico ne dà al massimo 50)
//   - eventi: i 100 più recenti senza ente, anche conclusi (decisione C: un
//     evento concluso si assegna se non ha ente, non si cambia)
// ---------------------------------------------------------------------------
function AdminAssignPanel({ t, orgId, orgName, onChallengeAssigned, setNotice }) {
  const [freeChallenges, setFreeChallenges] = useState([]);
  const [events, setEvents] = useState([]);
  const [challengeId, setChallengeId] = useState("");
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);

  const loadLists = useCallback(async () => {
    try {
      const [{ data }, ev] = await Promise.all([
        api.get(API_PATHS.challenges("?limit=50")),
        getAdminEvents({ limit: 100 }),
      ]);
      setFreeChallenges((data?.items ?? []).filter((c) => !c.organization));
      setEvents(ev?.items ?? []);
    } catch {
      setNotice({ type: "error", text: t("detail.adminListsError") });
    }
  }, [setNotice, t]);

  useEffect(() => { loadLists(); }, [loadLists]);

  // Da «Gestione enti», pulsante «Assegna» (scelta 2 del passo 3): si arriva qui
  const { hash } = useLocation();
  const panelRef = useRef(null);
  useEffect(() => {
    if (hash === "#assegnazione") panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  const orgEvents = events.filter((e) => String(e.organization?.id ?? "") === String(orgId));
  const freeEvents = events.filter((e) => !e.organization);

  const assignChallenge = async () => {
    if (!challengeId) return;
    setBusy(true);
    setNotice(null);
    try {
      await adminSetChallengeOrganization(Number(challengeId), Number(orgId));
      setChallengeId("");
      await Promise.all([onChallengeAssigned(), loadLists()]);
      setNotice({ type: "success", text: t("detail.adminAssigned", { name: orgName }) });
    } catch (err) {
      setNotice({ type: "error", text: beError(err) || t("common.genericError") });
    } finally {
      setBusy(false);
    }
  };

  const assignEvent = async () => {
    if (!eventId) return;
    setBusy(true);
    setNotice(null);
    try {
      await updateEvent(Number(eventId), { organization_id: Number(orgId) });
      setEventId("");
      await loadLists();
      setNotice({ type: "success", text: t("detail.adminAssigned", { name: orgName }) });
    } catch (err) {
      setNotice({ type: "error", text: beError(err) || t("common.genericError") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="assegnazione" ref={panelRef} className="card" style={{ padding: 16, marginTop: 24, scrollMarginTop: 80 }}>
      <h3 className="dynamic-title" style={{ marginTop: 0 }}>{t("detail.adminTitle")}</h3>
      <p className="muted">{t("detail.adminIntro")}</p>

      <h4 style={{ margin: "12px 0 4px" }}>{t("detail.adminEventsTitle")}</h4>
      {orgEvents.length === 0
        ? <p className="small muted">{t("detail.adminNoEvents")}</p>
        : (
          <ul className="small" style={{ marginTop: 0 }}>
            {orgEvents.map((e) => <li key={e.id}>{e.name} <span className="muted">({t(`detail.eventStatus.${e.status}`, e.status)})</span></li>)}
          </ul>
        )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <select className="control" style={{ flex: "1 1 260px" }} value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={busy} aria-label={t("detail.adminPickEvent")}>
          <option value="">{t("detail.adminPickEvent")}</option>
          {freeEvents.map((e) => (
            <option key={e.id} value={e.id}>{e.name} ({t(`detail.eventStatus.${e.status}`, e.status)})</option>
          ))}
        </select>
        <button className="btn btn-outline" onClick={assignEvent} disabled={busy || !eventId}>{t("detail.adminAssign")}</button>
      </div>
      <p className="small muted" style={{ marginTop: 4 }}>{t("detail.adminEventHelp")}</p>

      <h4 style={{ margin: "16px 0 4px" }}>{t("detail.adminChallengesTitle")}</h4>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="control" style={{ flex: "1 1 260px" }} value={challengeId} onChange={(e) => setChallengeId(e.target.value)} disabled={busy} aria-label={t("detail.adminPickChallenge")}>
          <option value="">{t("detail.adminPickChallenge")}</option>
          {freeChallenges.map((c) => (
            <option key={c.id} value={c.id}>{c.title} ({t(`detail.challengeStatus.${c.status}`, c.status)})</option>
          ))}
        </select>
        <button className="btn btn-outline" onClick={assignChallenge} disabled={busy || !challengeId}>{t("detail.adminAssign")}</button>
      </div>
      <p className="small muted" style={{ marginTop: 4 }}>{t("detail.adminChallengeHelp")}</p>
    </div>
  );
}
