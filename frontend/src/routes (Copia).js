// src/routes.js
export const routes = {
  /* ======================
   * AUTH
   * ====================== */
  auth: {
    login: '/login',
    register: '/register',
  },

  /* ======================
   * HOME & COMMUNITY
   * ====================== */
  home: '/',
  joinHelpLab: '/unisciti',
  info: '/benvenuto',
  leaderboard: '/leaderboard',

  community: {
    sponsors: '/sponsors',
    sponsorProfile: (id = ':id') => `/sponsors/${id}`,
    sponsorEdit: "/dashboard/sponsor",
  },

  /* ======================
   * CHALLENGES & LEARNING
   * ====================== */
  dashboard: {
    challenges: '/challenges',
    challengeSubmit: '/challenges/:id/submit',
    challengeLive: (id = ':id') => `/challenges/${id}/live`,
    learningPaths: '/learning-paths',
    // protette
    userProfile: '/dashboard/profile',
    challengeCreate: '/dashboard/challenges/create',
  },

  /* ======================
   * USER / AREA PERSONALE
   * ====================== */
  me: {
    contributions: '/me/contributi',
  },

  /* ======================
   * BUSINESS
   * ====================== */
  business: {
    packages: '/business/packages',
  },

  /* ======================
   * JUDGES
   * ====================== */
  judge: {
    dashboard: '/judge',
    challengeOverview: (id = ':id') => `/judge/challenges/${id}`,
  },

  /* ======================
   * ADMIN
   * ====================== */
  admin: {
    proposals: '/dashboard/admin/proposals',
    assignJudge: '/dashboard/admin/assign-judge',
  },

  /* ======================
   * MISC
   * ====================== */
  roadmap: '/roadmap',
  notFound: '*',
}
