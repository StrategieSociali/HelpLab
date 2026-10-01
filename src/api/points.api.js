// src/api/points.api.js
/**
 * API Punti — HelpLab
 * -------------------
 * Controllo di integrità del registro punti (solo admin).
 * Usa sempre `api` da client.js — mai fetch/axios diretti.
 *
 * ENDPOINT:
 *   GET  /admin/points-integrity         → divergenze di classifica + anomalie,
 *                                          con challenge_title e user_name accanto agli id
 *   POST /admin/points-integrity/repair  → ricalcola dal registro le sole divergenze
 *
 * Il riassunto dello stesso controllo (ok, count, anomalies_count) torna anche nella
 * risposta di approvazione e chiusura di un evento (campo `integrity`, vedi events.api.js).
 */

import { api } from "@/api/client";

/** @returns {Promise<{ok:boolean, count:number, divergences:Array, anomalies_count:number, anomalies:Array}>} */
export async function getPointsIntegrity() {
  const { data } = await api.get("/v1/admin/points-integrity");
  return data;
}

/** @returns {Promise<{ok:boolean, repaired:number, before:Array, after:Array}>} */
export async function repairPointsIntegrity() {
  const { data } = await api.post("/v1/admin/points-integrity/repair");
  return data;
}
