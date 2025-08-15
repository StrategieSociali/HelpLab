// Chiavi locali
const K_PROGRESS = "demo_progress";      // { [pathId]: [moduleId, ...] }
const K_CHALL = "demo_challenges";       // { [challengeId]: { joined: true, myScore: 0 } }

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// === Learning Paths ===
export function getAllProgress() {
  return read(K_PROGRESS, {});
}
export function isModuleDone(pathId, moduleId) {
  const all = getAllProgress();
  return Array.isArray(all[pathId]) && all[pathId].includes(moduleId);
}
export function completeModule(pathId, moduleId) {
  const all = getAllProgress();
  const list = Array.isArray(all[pathId]) ? all[pathId] : [];
  if (!list.includes(moduleId)) list.push(moduleId);
  all[pathId] = list;
  write(K_PROGRESS, all);
  return all;
}
export function resetDemo() {
  localStorage.removeItem(K_PROGRESS);
  localStorage.removeItem(K_CHALL);
}

// === Challenges ===
export function getChallengeState(challengeId) {
  const all = read(K_CHALL, {});
  return all[challengeId] ?? { joined: false, myScore: 0 };
}
export function joinChallenge(challengeId) {
  const all = read(K_CHALL, {});
  all[challengeId] = { joined: true, myScore: all[challengeId]?.myScore ?? 0 };
  write(K_CHALL, all);
  return all[challengeId];
}
export function addScore(challengeId, delta = 1) {
  const all = read(K_CHALL, {});
  const cur = all[challengeId] ?? { joined: false, myScore: 0 };
  cur.myScore = (cur.myScore || 0) + delta;
  all[challengeId] = cur;
  write(K_CHALL, all);
  return cur.myScore;
}

