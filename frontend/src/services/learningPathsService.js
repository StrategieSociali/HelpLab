import axios from "axios";
import { getAllProgress, completeModule } from "@/utils/demoStorage";

// Se l'API è configurata ma offline, cadiamo sui JSON/localStorage senza rompere la UI
export async function fetchLearningPaths(API_URL, headers) {
  if (API_URL) {
    try {
      const { data } = await axios.get(`${API_URL}/learning-paths`, { headers });
      return data;
    } catch (e) {
      console.warn("[LP] API non raggiungibile, uso dati demo:", e?.message || e);
    }
  }
  const res = await fetch("/data/learning-paths.json");
  return await res.json();
}

export async function fetchUserProgress(API_URL, headers) {
  if (API_URL) {
    try {
      const { data } = await axios.get(`${API_URL}/learning-paths/progress`, { headers });
      return data;
    } catch (e) {
      console.warn("[LP] Progress API non raggiungibile, uso localStorage:", e?.message || e);
    }
  }
  return getAllProgress(); // demo
}

export async function postProgress(API_URL, headers, pathId, moduleId) {
  if (API_URL) {
    try {
      await axios.post(`${API_URL}/learning-paths/${pathId}/progress`, { moduleId }, { headers });
      return true;
    } catch (e) {
      console.warn("[LP] POST progress fallito, salvo in demo:", e?.message || e);
    }
  }
  completeModule(pathId, moduleId); // demo
  return true;
}

