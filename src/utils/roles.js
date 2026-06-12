// src/utils/roles.js

export function isJudge(role) {
  return ["judge", "admin"].includes(role);
}

export function isAdmin(role) {
  return role === "admin";
}

export function isStandardUser(role) {
  return role === "user";
}

