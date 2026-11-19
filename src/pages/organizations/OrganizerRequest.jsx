// src/pages/organizations/OrganizerRequest.jsx
/**
 * Scopo: richiesta di registrare un ente organizzatore (8a, passo 2, scelta 2).
 *
 * - Dice chi può fare la richiesta (legale rappresentante o delegato) e chiede
 *   una casella obbligatoria con la dichiarazione.
 * - Il testo della dichiarazione arriva dal BE (GET /organizations/declaration):
 *   è lo stesso che il BE salva con la richiesta, quindi chi accetta vede
 *   esattamente ciò che resta scritto. Senza testo il modulo non si invia.
 * - Sotto, lo storico delle richieste di ente dell'utente, con l'esito.
 *
 * La possono usare tutti i ruoli (user, judge, sponsor): il ruolo non cambia,
 * chi la chiede diventa referente dell'ente all'approvazione.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { routes } from "@/routes";
import { getMyRoleRequests } from "@/api/roleRequests.api";
import { getOrganizerDeclaration, requestOrganization } from "@/api/organizations.api";
import "../../styles/dynamic-pages.css";

const MOTIVATION_MIN = 30;
const NAME_MIN = 2;

// verde quando basta, rosso tenue se iniziato ma non basta, neutro se vuoto
const fieldClass = (len, min) => (len >= min ? "input-valid" : len > 0 ? "input-invalid" : "");

// l'etichetta di stato non va a capo: andando a capo diventava un cerchio
const CHIP_STYLE = { whiteSpace: "nowrap", flexShrink: 0, alignSelf: "flex-start" };

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString() : "";
}

export default function OrganizerRequest() {
  const { t, ready } = useTranslation("pages/organizations", { useSuspense: false });

  const [declaration, setDeclaration] = useState(null); // null = in caricamento
  const [declarationError, setDeclarationError] = useState(false);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ company_name: "", motivation: "" });
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const data = await getMyRoleRequests();
      setRequests((data?.items ?? []).filter((r) => r.requested_role === "organizer"));
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    getOrganizerDeclaration()
      .then((text) => (text ? setDeclaration(text) : setDeclarationError(true)))
      .catch(() => setDeclarationError(true));
    loadRequests();
  }, [loadRequests]);

  const hasPending = requests.some((r) => r.status === "pending");
  const name = form.company_name.trim();
  const motivationLen = form.motivation.trim().length;
  const canSubmit =
    !!declaration && accepted && name.length >= NAME_MIN && motivationLen >= MOTIVATION_MIN && !submitting && !hasPending;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestOrganization({ company_name: name, motivation: form.motivation.trim() });
      setSent(true);
      setForm({ company_name: "", motivation: "" });
      setAccepted(false);
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.error || t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <section className="page-section page-text">
        <div className="container">…</div>
      </section>
    );
  }

  return (
    <section className="page-section page-text">
      <div className="container" style={{ maxWidth: 760 }}>
        <h2 className="page-title">{t("request.title")}</h2>
        <p>{t("request.intro")}</p>

        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <h3 className="dynamic-title">{t("request.whoTitle")}</h3>
          <p style={{ margin: 0 }}>{t("request.who")}</p>
        </div>

        {sent && <div className="callout success" style={{ marginTop: 16 }}>{t("request.sent")}</div>}
        {hasPending && !sent && (
          <div className="callout neutral" style={{ marginTop: 16 }}>{t("request.pendingNotice")}</div>
        )}

        {!hasPending && (
          <form onSubmit={onSubmit} className="registration-form" style={{ marginTop: 24 }} aria-label={t("request.title")}>
            <div className="form-group">
              <label htmlFor="org_name">{t("request.nameLabel")}</label>
              <input
                id="org_name"
                className={fieldClass(name.length, NAME_MIN)}
                type="text"
                maxLength={180}
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                placeholder={t("request.namePlaceholder")}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="org_motivation">{t("request.motivationLabel")}</label>
              <textarea
                id="org_motivation"
                className={fieldClass(motivationLen, MOTIVATION_MIN)}
                rows={5}
                maxLength={3000}
                value={form.motivation}
                onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))}
                placeholder={t("request.motivationPlaceholder")}
                disabled={submitting}
                required
                aria-describedby="org_motivation_count"
              />
              <div id="org_motivation_count" className={`hint ${motivationLen >= MOTIVATION_MIN ? "ok" : ""}`}>
                {motivationLen >= MOTIVATION_MIN
                  ? t("request.motivationOk")
                  : t("request.motivationCount", { count: motivationLen, min: MOTIVATION_MIN })}
              </div>
            </div>

            <fieldset className="form-group" style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
              <legend className="small muted" style={{ marginBottom: 6 }}>{t("request.declarationTitle")}</legend>
              {declarationError && <div className="callout error">{t("request.declarationError")}</div>}
              {declaration === null && !declarationError && <div className="small muted">{t("common.loading")}</div>}
              {declaration && (
                <label
                  style={{
                    display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
                    padding: 12, borderRadius: 8,
                    border: accepted ? "1px solid rgba(16,185,129,0.6)" : "1px solid rgba(255,255,255,0.2)",
                    transition: "border-color 0.2s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    disabled={submitting}
                    required
                    style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18 }}
                  />
                  <span>{declaration}</span>
                </label>
              )}
            </fieldset>

            {error && <div className="callout error" style={{ marginBottom: 16 }}>{error}</div>}

            <button type="submit" className="submit-button" disabled={!canSubmit}>
              {submitting ? t("request.sending") : t("request.submit")}
            </button>
            {!canSubmit && !submitting && (
              <div className="hint" style={{ textAlign: "center" }}>{t("request.submitHint")}</div>
            )}
          </form>
        )}

        <div className="card" style={{ padding: 16, marginTop: 24 }}>
          <h3 className="dynamic-title">{t("request.historyTitle")}</h3>
          {requests.length === 0 && <p className="muted" style={{ margin: 0 }}>{t("request.historyEmpty")}</p>}
          <div style={{ display: "grid", gap: 10 }}>
            {requests.map((r) => (
              <div key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>{r.company_name}</strong>
                  <span style={CHIP_STYLE} className={`chip ${r.status === "approved" ? "chip-success" : r.status === "rejected" ? "chip-error" : "chip-neutral"}`}>
                    {t(`request.status.${r.status}`)}
                  </span>
                </div>
                <div className="small muted">{fmtDate(r.created_at)}</div>
                {r.status === "rejected" && r.rejection_reason && (
                  <p className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                    {t("request.teamAnswer")} {r.rejection_reason}
                  </p>
                )}
                {r.status === "approved" && r.organization_id && (
                  <Link className="btn btn-outline btn-small" style={{ marginTop: 6 }} to={routes.organizations.detail(r.organization_id)}>
                    {t("request.openOrganization")}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
