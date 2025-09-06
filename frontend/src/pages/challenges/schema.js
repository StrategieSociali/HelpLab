export const EMPTY_CHALLENGE = {
  title: "",
  description: "",
  impact_type: "",
  location: { address: "", geo: null },
  start_date: "",
  deadline: "",
  target: { kind: "", unit: "", amount: null },
  tasks: [],
  co2e_estimate_kg: null,   // usa CO₂e OPPURE difficulty (mutuamente esclusivi)
  difficulty: null,
  complexity_notes: "",
  sponsor_interest: false,
  sponsor_pitch: "",
  sponsor_budget_requested: null,
  visibility_options: { logo: false, social_mentions: false, press_event: false },
  organizer_visibility: "public",
  terms_consent: false,
};

export function canProceedBasic(draft) {
  const titleOk = (draft.title || "").trim().length >= 5;
  const descOk  = (draft.description || "").trim().length >= 50;
  const targetOk = (draft.target?.amount || 0) > 0;
  const tasksOk  = Array.isArray(draft.tasks) && draft.tasks.length >= 2 &&
                   draft.tasks.some(t => t.evidence_required);
  const modeCO2  = draft.co2e_estimate_kg != null && !draft.difficulty;
  const modeDiff = draft.difficulty && draft.co2e_estimate_kg == null;
  const modeOk   = modeCO2 || modeDiff;
  const addrOk   = !!(draft.location?.address);
  const datesOk  = !!draft.start_date && !!draft.deadline &&
                   (new Date(draft.deadline) > new Date(draft.start_date));
  const termsOk  = !!draft.terms_consent;

  return titleOk && descOk && targetOk && tasksOk && modeOk && addrOk && datesOk && termsOk;
}

