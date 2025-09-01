export const EMPTY_CHALLENGE = {
  // Step 1
  title: "",
  description: "",
  impact_type: "", // "tree_planting" | "no_waste" | "green_area" | "social" | "education" | "other"
  location: { address: "", geo: null }, // geo: { lat, lon } | null
  start_date: "",
  deadline: "",
  organizer_visibility: "public", // "public" | "private-to-participants" | "anonymous"
  media: [],

  // Step 2
  target: { kind: "", unit: "", amount: null }, // kind: "area|quantità|numero|misto"
  tasks: [],
  judge_preferred: "",
  verification_notes: "",

  // Step 3 (uno dei due)
  co2e_estimate_kg: null, // Variante impatto
  impact_inputs: { tree_planting: null, no_waste: null, green_area: null },
  difficulty: "",         // Variante difficoltà: "low|medium|high"
  complexity_notes: "",

  // Step 4
  sponsor_interest: false,
  sponsor_pitch: "",
  sponsor_budget_requested: null,
  visibility_options: { logo: false, social_mentions: false, press_event: false },
  terms_consent: false,
};

