// src/components/organizations/OrganizationChoice.jsx
/**
 * Scelta «a nome mio / a nome dell'ente X» (8a, passo 3, scelte 3 e 4).
 *
 * Usata nella creazione e nella modifica di un evento e nella proposta di una
 * sfida. Elenca solo gli enti di cui chi scrive è membro attivo: il BE rifiuta
 * con 403 un ente diverso, qui non lo si propone nemmeno.
 *
 * Chi non fa parte di nessun ente non vede niente: per lui non c'è scelta.
 *
 * PROPS:
 *   value       {number|null}  id dell'ente scelto, null = a nome mio
 *   onChange    {Function}     riceve l'id (numero) o null
 *   context     {"event"|"proposal"}  cambia solo la frase di aiuto
 *   disabled    {boolean}
 *   allowMine   {boolean}      false nasconde «a nome mio» (default true)
 *   extraOrg    {{id,name}|null} ente già assegnato di cui chi guarda non è
 *                               membro (l'admin): resta tra le opzioni
 *   loader      {Function}     al posto dei miei enti: l'admin passa
 *                               adminGetOrganizations e sceglie tra tutti
 */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMyOrganizations } from "@/api/organizations.api";

export default function OrganizationChoice({
  value = null,
  onChange,
  context = "event",
  disabled = false,
  allowMine = true,
  extraOrg = null,
  loader = getMyOrganizations,
}) {
  const { t } = useTranslation("pages/organizations", { useSuspense: false });
  const [orgs, setOrgs] = useState(null); // null = in caricamento
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    loader()
      .then((items) => { if (alive) setOrgs(items); })
      .catch(() => { if (alive) { setOrgs([]); setError(true); } });
    return () => { alive = false; };
  }, []);

  const options = [...(orgs || [])];
  if (extraOrg && !options.some((o) => String(o.id) === String(extraOrg.id))) {
    options.push(extraOrg);
  }

  // Un ente che non è più tra i miei (bozza salvata nel browser, uscita
  // dall'ente nel frattempo) torna «a nome mio», invece di restare scelto di
  // nascosto e farsi rifiutare all'invio.
  const stale = orgs !== null && value != null && allowMine &&
    !options.some((o) => String(o.id) === String(value));
  useEffect(() => { if (stale) onChange(null); }, [stale]); // eslint-disable-line react-hooks/exhaustive-deps

  if (orgs === null) return null;
  if (options.length === 0) {
    return error ? <div className="hint warn">{t("choice.loadError")}</div> : null;
  }

  const current = value == null ? "" : String(value);

  return (
    <label>
      {t("choice.label")}
      <select
        className="control"
        value={current}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        disabled={disabled}
      >
        {allowMine && <option value="">{t("choice.mine")}</option>}
        {!allowMine && current === "" && <option value="">{t("choice.pick")}</option>}
        {options.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {t("choice.org", { name: o.name })}
          </option>
        ))}
      </select>
      <div className="hint">
        {context === "proposal" ? t("choice.helpProposal") : t("choice.helpEvent")}
      </div>
    </label>
  );
}
