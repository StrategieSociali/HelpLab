// src/pages/admin/AdminOrganizations.jsx
/**
 * Scopo: pannello admin degli enti organizzatori (8a, passo 2).
 *
 * Scheda «Richieste»: le richieste di ruolo `organizer`. Approvare crea l'ente e
 * fa di chi l'ha chiesto il primo referente; il suo ruolo NON cambia. Rifiutare
 * chiede una risposta, che l'utente riceve anche per email.
 *
 * Scheda «Enti»: elenco con referenti e membri; l'admin cambia il nome (è lui
 * che lo approva) e collega un profilo sponsor (scelta 1-bis). L'admin NON
 * aggiunge membri: li invita il referente (scelta 2-bis).
 */
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Modal from "@/components/UI/Modal";
import { routes } from "@/routes";
import { api } from "@/api/client";
import {
  adminApproveRoleRequest,
  adminGetRoleRequests,
  adminRejectRoleRequest,
} from "@/api/roleRequests.api";
import { adminGetOrganizations, adminUpdateOrganization } from "@/api/organizations.api";

const PAGE_SIZE = 20;
// l'etichetta di stato non va a capo: andando a capo diventava un cerchio
const CHIP_STYLE = { whiteSpace: "nowrap", flexShrink: 0, alignSelf: "flex-start" };
const beError = (err) => err?.response?.data?.error || null;

function fmtDateTime(iso) {
  return iso ? new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
}

// ---------------------------------------------------------------------------
// Richieste
// ---------------------------------------------------------------------------

function RequestsTab({ t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("pending");
  const [nextCursor, setNextCursor] = useState(null);
  const [rejecting, setRejecting] = useState(null); // richiesta da rifiutare
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async ({ append = false, cursor = null } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetRoleRequests({
        requested_role: "organizer",
        status: status || undefined,
        limit: PAGE_SIZE,
        cursor: append ? cursor : undefined,
      });
      const list = data?.items ?? [];
      setItems((prev) => (append ? [...prev, ...list] : list));
      setNextCursor(data?.nextCursor ?? null);
    } catch (err) {
      setError(beError(err) || t("requests.loadError"));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => { load(); }, [load]);

  const approve = async (item) => {
    if (!window.confirm(t("requests.approveConfirm", { name: item.company_name }))) return;
    setActionError(null);
    try {
      const res = await adminApproveRoleRequest(item.id);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "approved", organization_id: res?.organization_id ?? null } : i)));
    } catch (err) {
      setActionError(beError(err) || t("requests.approveError"));
    }
  };

  const reject = async () => {
    const item = rejecting;
    const text = reason.trim();
    setRejecting(null);
    setReason("");
    setActionError(null);
    try {
      await adminRejectRoleRequest(item.id, { rejection_reason: text || undefined });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "rejected", rejection_reason: text || null } : i)));
    } catch (err) {
      setActionError(beError(err) || t("requests.rejectError"));
    }
  };

  const statuses = [
    { value: "", label: t("requests.filterAll") },
    { value: "pending", label: t("requests.filterPending") },
    { value: "approved", label: t("requests.filterApproved") },
    { value: "rejected", label: t("requests.filterRejected") },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="control control-small control-pill" value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="btn btn-ghost btn-small" onClick={() => load()}>↺ {t("refresh")}</button>
      </div>

      {actionError && <div className="callout error" style={{ marginBottom: 12 }}>{actionError}</div>}
      {error && <div className="callout error" style={{ marginBottom: 12 }}>{error}</div>}
      {loading && <div className="callout neutral">{t("loading")}</div>}
      {!loading && !error && items.length === 0 && <div className="callout neutral">{t("requests.empty")}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => (
          <div key={item.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <p className="small muted" style={{ margin: 0 }}>#{item.id} · {fmtDateTime(item.created_at)}</p>
                <strong>{item.company_name}</strong>
                <div className="small muted">
                  {t("requests.requestedBy")} {item.user?.username} · {item.user?.email} · {item.user?.role}
                </div>
              </div>
              <span style={CHIP_STYLE} className={`chip ${item.status === "approved" ? "chip-success" : item.status === "rejected" ? "chip-error" : "chip-neutral"}`}>
                {t(`requests.status.${item.status}`)}
              </span>
            </div>

            <details style={{ marginTop: 8 }} open={item.status === "pending"}>
              <summary className="small muted" style={{ cursor: "pointer" }}>{t("requests.motivation")}</summary>
              <p className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{item.motivation}</p>
            </details>
            {item.declaration_text && (
              <p className="small muted" style={{ marginTop: 6 }}>
                {t("requests.declaration")}: «{item.declaration_text}»
              </p>
            )}

            {item.rejection_reason && (
              <p className="small callout error" style={{ marginTop: 8 }}>{t("requests.rejectionReason")} {item.rejection_reason}</p>
            )}
            {item.status === "approved" && item.organization_id && (
              <Link className="small link-accent" to={routes.organizations.detail(item.organization_id)}>
                {t("requests.createdOrganization", { id: item.organization_id })}
              </Link>
            )}

            {item.status === "pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-small" onClick={() => approve(item)}>✅ {t("requests.approve")}</button>
                <button className="btn btn-outline btn-small" style={{ color: "var(--color-error, #c0392b)" }} onClick={() => setRejecting(item)}>
                  ❌ {t("requests.reject")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {nextCursor && !loading && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn btn-outline" onClick={() => load({ append: true, cursor: nextCursor })}>{t("requests.loadMore")}</button>
        </div>
      )}

      {rejecting && (
        <Modal title={t("requests.rejectTitle")} onClose={() => { setRejecting(null); setReason(""); }}>
          <div className="form-group">
            <label htmlFor="reject-reason">{t("requests.rejectLabel")}</label>
            <textarea id="reject-reason" rows={4} style={{ width: "100%" }} maxLength={3000}
              value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("requests.rejectPlaceholder")} />
          </div>
          <div className="dynamic-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={reason.trim().length < 10} onClick={reject}>
              {t("requests.confirm")}
            </button>
            <button className="btn btn-ghost" onClick={() => { setRejecting(null); setReason(""); }}>{t("requests.cancel")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enti
// ---------------------------------------------------------------------------

function OrganizationRow({ org, t, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(org.name);
  const [sponsorId, setSponsorId] = useState(org.sponsor_id ?? "");
  const [search, setSearch] = useState("");
  const [sponsors, setSponsors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Elenco pubblico degli sponsor, con ricerca per nome (GET /v1/sponsors)
  useEffect(() => {
    if (!editing) return;
    let alive = true;
    const params = new URLSearchParams({ limit: "50" });
    if (search.trim()) params.set("search", search.trim());
    api.get(`/v1/sponsors?${params}`)
      .then((res) => { if (alive) setSponsors(res.data?.items ?? []); })
      .catch(() => { if (alive) setSponsors([]); });
    return () => { alive = false; };
  }, [editing, search]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {};
      if (name.trim() !== org.name) body.name = name.trim();
      const sid = sponsorId === "" ? null : Number(sponsorId);
      if (sid !== (org.sponsor_id ?? null)) body.sponsor_id = sid;
      if (Object.keys(body).length > 0) await adminUpdateOrganization(org.id, body);
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(beError(err) || t("organizations.saveError"));
    } finally {
      setSaving(false);
    }
  };

  // lo sponsor collegato resta nella tendina anche se la ricerca non lo trova
  const options = sponsors.some((s) => String(s.id) === String(org.sponsor_id)) || !org.sponsor_id
    ? sponsors
    : [{ id: org.sponsor_id, name: org.sponsor_name || `#${org.sponsor_id}` }, ...sponsors];

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <p className="small muted" style={{ margin: 0 }}>#{org.id} · {t("organizations.createdAt")} {fmtDateTime(org.created_at)}</p>
          <Link className="link-accent" to={routes.organizations.detail(org.id)}>{org.name}</Link>
          <div className="small muted">{t("organizations.members", { count: org.members_count })}</div>
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {/* 8a, passo 3, scelta 2: il pannello di assegnazione sta nella pagina dell'ente */}
            <Link className="btn btn-outline btn-small" to={`${routes.organizations.detail(org.id)}#assegnazione`}>{t("organizations.assign")}</Link>
            <button className="btn btn-outline btn-small" onClick={() => setEditing(true)}>{t("organizations.edit")}</button>
          </div>
        )}
      </div>

      <div className="small" style={{ marginTop: 8 }}>
        <strong>{t("organizations.referents")}:</strong>{" "}
        {org.referents.length === 0
          ? <span className="muted">{t("organizations.noReferents")}</span>
          : org.referents.map((r) => `${r.name}${r.email ? ` (${r.email})` : ""}`).join(", ")}
      </div>
      <div className="small" style={{ marginTop: 4 }}>
        <strong>{t("organizations.sponsor")}:</strong> {org.sponsor_name || <span className="muted">{t("organizations.noSponsor")}</span>}
      </div>

      {editing && (
        <div className="registration-form" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label htmlFor={`org-name-${org.id}`}>{t("organizations.name")}</label>
            <input id={`org-name-${org.id}`} type="text" maxLength={180} value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label htmlFor={`org-sponsor-${org.id}`}>{t("organizations.sponsor")}</label>
            <input type="search" className="control" placeholder={t("organizations.sponsorSearch")} aria-label={t("organizations.sponsorSearch")}
              value={search} onChange={(e) => setSearch(e.target.value)} disabled={saving} style={{ marginBottom: 6 }} />
            <select id={`org-sponsor-${org.id}`} className="control" value={sponsorId} onChange={(e) => setSponsorId(e.target.value)} disabled={saving}>
              <option value="">{t("organizations.noSponsor")}</option>
              {options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <p className="small muted" style={{ marginTop: 4 }}>{t("organizations.sponsorHelp")}</p>
          </div>
          {error && <div className="callout error" style={{ marginBottom: 8 }}>{error}</div>}
          <div className="dynamic-actions">
            <button className="btn btn-primary" onClick={save} disabled={saving || name.trim().length < 2}>
              {saving ? t("organizations.saving") : t("organizations.save")}
            </button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setName(org.name); setSponsorId(org.sponsor_id ?? ""); setError(null); }} disabled={saving}>
              {t("organizations.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrganizationsTab({ t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminGetOrganizations());
    } catch (err) {
      setError(beError(err) || t("organizations.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-small" onClick={load}>↺ {t("refresh")}</button>
      </div>
      {error && <div className="callout error" style={{ marginBottom: 12 }}>{error}</div>}
      {loading && <div className="callout neutral">{t("loading")}</div>}
      {!loading && !error && items.length === 0 && <div className="callout neutral">{t("organizations.empty")}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((o) => <OrganizationRow key={o.id} org={o} t={t} onSaved={load} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

export default function AdminOrganizations() {
  const { t, ready } = useTranslation("pages/adminOrganizations", { useSuspense: false });
  const [tab, setTab] = useState("requests");

  if (!ready) return <section className="page-section page-text"><div className="container">…</div></section>;

  return (
    <section className="page-section page-bg page-text">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("subtitle")}</p>
        </header>

        <div role="tablist" aria-label={t("title")}
          style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid var(--color-border, #e0e0e0)" }}>
          {["requests", "organizations"].map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`btn btn-ghost ${tab === key ? "active" : ""}`}
              style={{
                borderBottom: tab === key ? "2px solid var(--color-primary, #2563eb)" : "2px solid transparent",
                borderRadius: 0,
                marginBottom: -2,
                fontWeight: tab === key ? 600 : 400,
              }}
              onClick={() => setTab(key)}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>

        {tab === "requests" && <RequestsTab t={t} />}
        {tab === "organizations" && <OrganizationsTab t={t} />}
      </div>
    </section>
  );
}
