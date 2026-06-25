// src/components/points/CalibrationBadge.jsx
/**
 * CalibrationBadge.jsx
 * --------------------
 * Segnala in modo trasparente che i punteggi mostrati provengono dal Motore
 * Punti (points.v1) in taratura dichiarata (beta).
 *
 * Si mostra SOLO quando il cutover beta è attivo lato server. Lo stato è un flag
 * GLOBALE (env): non cambia durante la sessione, quindi si legge una volta al
 * mount e non si polla. In caso di dubbio (errore di rete) non si mostra nulla.
 *
 * ENDPOINT: GET /v1/points-status → { calibration_beta: boolean }
 *
 * USO:
 *   <CalibrationBadge />               // solo il badge (accanto a un titolo)
 *   <CalibrationBadge withCaption />   // badge + riga esplicativa (proiezione)
 */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";

export default function CalibrationBadge({ withCaption = false, className = "" }) {
  const { t } = useTranslation("components/points/calibrationBadge", {
    useSuspense: false,
  });
  const [beta, setBeta] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/v1/points-status")
      .then(({ data }) => {
        if (alive) setBeta(Boolean(data?.calibration_beta));
      })
      .catch(() => {
        if (alive) setBeta(false); // nel dubbio non si mostra nulla
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!beta) return null;

  return (
    <span className={`calibration ${className}`.trim()}>
      <span className="calibration-badge" role="status" title={t("tooltip")}>
        <span className="calibration-badge__meter" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="calibration-badge__label">{t("label")}</span>
        <span className="calibration-badge__beta">{t("beta")}</span>
      </span>
      {withCaption && (
        <span className="muted small calibration-caption">{t("caption")}</span>
      )}
    </span>
  );
}
