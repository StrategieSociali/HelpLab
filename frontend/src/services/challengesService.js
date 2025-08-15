import axios from "axios";
import { getChallengeState, joinChallenge, addScore } from "@/utils/demoStorage";

const apiBase = (API_URL) => API_URL ?? import.meta.env.VITE_API_URL ?? null;

async function readDemoJSON(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} su ${path}`);
    try {
      return await res.json();
    } catch (e) {
      throw new Error(`JSON non valido in ${path}: ${e.message}`);
    }
  } catch (e) {
    console.error("[CH] Errore lettura demo JSON:", e);
    return []; // non rompiamo la UI
  }
}

export async function fetchChallenges(API_URL, headers = {}) {
  const base = apiBase(API_URL);
  if (base) {
    try {
      const { data } = await axios.get(`${base}/challenges`, { headers });
      return data;
    } catch (e) {
      console.warn("[CH] API /challenges non raggiungibile, uso dati demo:", e?.message || e);
    }
  }
  return await readDemoJSON("/data/challenges.json");
}

export async function fetchLeaderboard(API_URL, headers = {}, challengeId) {
  const base = apiBase(API_URL);
  if (base) {
    try {
      const { data } = await axios.get(`${base}/challenges/${challengeId}/scoreboard`, { headers });
      return data;
    } catch (e) {
      console.warn("[CH] API /scoreboard non raggiungibile, uso demo:", e?.message || e);
    }
  }
  const all = await readDemoJSON("/data/challenges.json");
  const ch = Array.isArray(all) ? all.find((c) => c.id === challengeId) : null;
  const baseBoard = ch?.scoreboard ?? [];
  const my = getChallengeState(challengeId);
  if (my.joined && my.myScore > 0) return [{ user: "Tu", score: my.myScore }, ...baseBoard];
  return baseBoard;
}

export async function joinChallengeDemo(API_URL, headers = {}, challengeId) {
  const base = apiBase(API_URL);
  if (base) {
    try {
      await axios.post(`${base}/challenges/${challengeId}/join`, {}, { headers });
      return true;
    } catch (e) {
      console.warn("[CH] Join fallito, salvo stato demo:", e?.message || e);
    }
  }
  joinChallenge(challengeId);
  return true;
}

export async function submitResultDemo(API_URL, headers = {}, challengeId, delta = 1) {
  const base = apiBase(API_URL);
  if (base) {
    try {
      await axios.post(`${base}/challenges/${challengeId}/submit`, { delta }, { headers });
      return true;
    } catch (e) {
      console.warn("[CH] Submit fallito, salvo punteggio demo:", e?.message || e);
    }
  }
  addScore(challengeId, delta);
  return true;
}

