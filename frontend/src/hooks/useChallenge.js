// src/hooks/useChallenge.js
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function useChallenge(challengeId) {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!challengeId) return;
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/v1/challenges/${challengeId}`);
        setChallenge(data);
      } catch (err) {
        setError(err.message || "Errore");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [challengeId]);

  return { challenge, loading, error };
}

