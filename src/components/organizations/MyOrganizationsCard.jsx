// src/components/organizations/MyOrganizationsCard.jsx
/**
 * Scopo: nell'area personale, gli enti di cui l'utente fa parte e gli inviti in
 * attesa (8a, passo 2, scelta 2-bis).
 *
 * L'invito vale solo dopo l'accettazione, e si accetta qui: l'email avvisa
 * soltanto, e rimanda a questa pagina. Il collegamento «Registra un ente» porta
 * alla richiesta, aperta a tutti i ruoli tranne l'admin.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { routes } from "@/routes";
import {
  answerOrganizationInvite,
  getMyOrganizationInvites,
  getMyOrganizations,
} from "@/api/organizations.api";

export default function MyOrganizationsCard({ isAdmin = false }) {
  const { t, ready } = useTranslation("pages/organizations", { useSuspense: false });
  const [orgs, setOrgs] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { key } da tradurre, oppure { message } dal BE
  const [busy, setBusy] = useState(null); // member_id in lavorazione

  const load = useCallback(async () => {
    setError(null);
    try {
      const [o, i] = await Promise.all([getMyOrganizations(), getMyOrganizationInvites()]);
      setOrgs(o);
      setInvites(i);
    } catch {
      setError({ key: "card.loadError" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const answer = async (inv, action) => {
    if (action === "decline" && !window.confirm(t("card.declineConfirm", { name: inv.organization_name }))) return;
    setBusy(inv.member_id);
    setError(null);
    try {
      await answerOrganizationInvite(inv.member_id, action);
      await load();
    } catch (err) {
      const message = err?.response?.data?.error;
      setError(message ? { message } : { key: "common.genericError" });
    } finally {
      setBusy(null);
    }
  };

  if (!ready) return null;

  // i messaggi del BE arrivano già scritti; le nostre chiavi passano da t()
  const errorText = error ? (error.key ? t(error.key) : error.message) : null;

  return (
    <div className="card" style={{ padding: 16, marginTop: 24 }}>
      <h3 className="dynamic-title">{t("card.title")}</h3>

      {errorText && <div className="callout error" style={{ marginBottom: 12 }}>{errorText}</div>}
      {loading && <p className="muted">{t("common.loading")}</p>}

      {!loading && invites.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 8px" }}>{t("card.invitesTitle")}</h4>
          <div style={{ display: "grid", gap: 8 }}>
            {invites.map((inv) => (
              <div key={inv.member_id} className="callout info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <strong>{inv.organization_name}</strong>
                  {inv.invited_by && <div className="small muted">{t("card.invitedBy", { name: inv.invited_by })}</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-small" disabled={busy === inv.member_id} onClick={() => answer(inv, "accept")}>
                    {t("card.accept")}
                  </button>
                  <button className="btn btn-ghost btn-small" disabled={busy === inv.member_id} onClick={() => answer(inv, "decline")}>
                    {t("card.decline")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <>
          <p className="muted">{orgs.length === 0 ? t("card.empty") : t("card.intro")}</p>
          {orgs.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "grid", gap: 8 }}>
              {orgs.map((o) => (
                <li key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>
                    <strong>{o.name}</strong>{" "}
                    <span className="chip chip-role">{t(`common.roles.${o.my_role}`)}</span>
                  </span>
                  <Link className="btn btn-outline btn-small" to={routes.organizations.detail(o.id)}>
                    {t("card.open")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!isAdmin && (
            <Link className="btn btn-outline" to={routes.organizations.request}>
              {t("card.requestLink")}
            </Link>
          )}
        </>
      )}
    </div>
  );
}
