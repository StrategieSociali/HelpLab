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
  },

  /* ======================
   * CHALLENGES & LEARNING
   * ====================== */
  dashboard: {
    // pubbliche
    challenges: '/challenges',
    challengeSubmissions: '/challenges/:challengeId/submissions',
    learningPaths: '/learning-paths',

    // protette
    userProfile: '/dashboard/profile',
    challengeCreate: '/dashboard/challenges/create',
  },

  /* ======================
   * BUSINESS
   * ====================== */
  business: {
    root: '/business',
    packages: '/business/packages',
  },

  /* ======================
   * JUDGES
   * ====================== */
  judge: {
    moderation: '/modera',
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
};
