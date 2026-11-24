// src/pages/organizations/EditOrganizationChallenge.jsx
/**
 * Scopo: «Modifica sfida» nell'area dell'ente (8a, passo 3, decisione D del PM).
 *
 * I referenti dell'ente (e l'admin) cambiano i testi di una sfida dell'ente:
 * titolo, luogo, descrizione e scadenza. Tipo, obiettivi, calcolatori e stato
 * restano all'admin (e al giudice per gli obiettivi): decidono impatto e punti,
 * e il BE li rifiuta su questa rotta (PATCH /challenges/:id/texts, corpo stretto).
 *
 * Il membro semplice non arriva qui dai pulsanti; se apre l'indirizzo a mano
 * vede un avviso, e il BE gli risponderebbe comunque 403.
 *
 * ROUTE: /dashboard/enti/:id/sfide/:challengeId/modifica
 */
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { routes } from "@/routes";
import {
  getOrganization,
  getOrganizationChallenges,
  updateChallengeTexts,
} from "@/api/organizations.api";
import "../../styles/dynamic-pages.css";

const TITLE_MIN = 5;
const TITLE_MAX = 200;
const LOCATION_MAX = 255;
const RULES_MAX = 10000;

const beError = (err) => {
  const d = err?.response?.data;
  if (d?.errors && typeof d.errors === "object") {
    const first = Object.values(d.errors).flat().find(Boolean);
    if (first) return first;
  }
  return d?.error || null;
};

const fromChallenge = (ch) => ({
  title: ch.title ?? "",
  location: ch.location ?? "",
  rules: ch.rules ?? "",
  deadline: ch.deadline ?? "",
});

export default function EditOrganizationChallenge() {
  const { id, challengeId } = useParams();
  const { t, ready } = useTranslation("pages/organizations", { useSuspense: false });

  const [org, setOrg] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | notFound | error
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [o, list] = await Promise.all([getOrganization(id), getOrganizationChallenges(id)]);
        if (!alive) return;
        const ch = list.find((c) => String(c.id) === String(challengeId));
        if (!ch) { setState("notFound"); return; }
        setOrg(o);
        setChallenge(ch);
        setForm(fromChallenge(ch));
        setState("ready");
      } catch (err) {
        if (!alive) return;
        setState(err?.response?.status === 404 ? "notFound" : "error");
      }
    })();
    return () => { alive = false; };
  }, [id, challengeId]);

  if (!ready) {
    return <section className="page-section page-text"><div className="container">…</div></section>;
  }

  const back = (
    <Link to={routes.organizations.detail(id)} className="btn btn-ghost btn-small">← {t("challengeEdit.back")}</Link>
  );

  if (state !== "ready") {
    return (
      <section className="page-section page-text">
        <div className="container" style={{ maxWidth: 760 }}>
          {back}
          <div className={`callout ${state === "error" ? "error" : "neutral"}`} style={{ marginTop: 12 }}>
            {state === "loading" ? t("common.loading")
              : state === "notFound" ? t("challengeEdit.notFound")
              : t("common.genericError")}
          </div>
        </div>
      </section>
    );
  }

  if (!challenge.can_edit_texts) {
    return (
      <section className="page-section page-text">
        <div className="container" style={{ maxWidth: 760 }}>
          {back}
          <div className="callout neutral" style={{ marginTop: 12 }}>{t("challengeEdit.notAllowed")}</div>
        </div>
      </section>
    );
  }

  const titleLen = form.title.trim().length;
  const titleOk = titleLen >= TITLE_MIN && titleLen <= TITLE_MAX;
  const original = fromChallenge(challenge);

  // Solo i campi cambiati: luogo e scadenza vuoti diventano null (tolti)
  const changes = {};
  if (form.title.trim() !== original.title.trim()) changes.title = form.title.trim();
  if (form.location.trim() !== original.location.trim()) changes.location = form.location.trim() || null;
  if (form.rules !== original.rules) changes.rules = form.rules;
  if (form.deadline !== original.deadline) changes.deadline = form.deadline || null;
  const dirty = Object.keys(changes).length > 0;

  const save = async (e) => {
    e.preventDefault();
    if (!titleOk || !dirty) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await updateChallengeTexts(challenge.id, changes);
      const next = { ...challenge, ...updated };
      setChallenge(next);
      setForm(fromChallenge(next));
      setNotice({ type: "success", text: t("challengeEdit.saved") });
    } catch (err) {
      setNotice({ type: "error", text: beError(err) || t("common.genericError") });
    } finally {
      setSaving(false);
    }
  };

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setNotice(null); };

  return (
    <section className="page-section page-text">
      <div className="container" style={{ maxWidth: 760 }}>
        {back}
        <h2 className="page-title" style={{ margin: "12px 0 4px" }}>{t("challengeEdit.title")}</h2>
        <p className="muted" style={{ marginTop: 0 }}>{t("challengeEdit.subtitle", { name: org?.name })}</p>

        {notice && <div className={`callout ${notice.type}`} style={{ marginBottom: 12 }}>{notice.text}</div>}

        <form onSubmit={save} className="card registration-form" style={{ padding: 16 }}>
          <p className="small muted" style={{ marginTop: 0 }}>{t("challengeEdit.scopeNote")}</p>

          <div className="form-group">
            <label htmlFor="ch_title">{t("challengeEdit.titleLabel")}</label>
            <input id="ch_title" type="text" maxLength={TITLE_MAX} value={form.title}
              className={titleOk ? "input-valid" : ""}
              onChange={(e) => set({ title: e.target.value })} disabled={saving} />
            {!titleOk && <p className="small muted" style={{ marginTop: 4 }}>{t("challengeEdit.titleHint", { min: TITLE_MIN, count: titleLen })}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="ch_location">{t("challengeEdit.locationLabel")}</label>
            <input id="ch_location" type="text" maxLength={LOCATION_MAX} value={form.location}
              onChange={(e) => set({ location: e.target.value })} disabled={saving} />
          </div>

          <div className="form-group">
            <label htmlFor="ch_rules">{t("challengeEdit.rulesLabel")}</label>
            <textarea id="ch_rules" rows={8} maxLength={RULES_MAX} value={form.rules}
              onChange={(e) => set({ rules: e.target.value })} disabled={saving} />
            <p className="small muted" style={{ marginTop: 4 }}>{t("challengeEdit.rulesHelp")}</p>
          </div>

          <div className="form-group">
            <label htmlFor="ch_deadline">{t("challengeEdit.deadlineLabel")}</label>
            <input id="ch_deadline" type="date" value={form.deadline}
              onChange={(e) => set({ deadline: e.target.value })} disabled={saving} />
          </div>

          <div className="dynamic-actions">
            <button type="submit" className="btn btn-primary submit-button" disabled={saving || !titleOk || !dirty}>
              {saving ? t("challengeEdit.saving") : t("challengeEdit.save")}
            </button>
            {dirty && (
              <button type="button" className="btn btn-ghost" onClick={() => { setForm(fromChallenge(challenge)); setNotice(null); }} disabled={saving}>
                {t("challengeEdit.reset")}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
