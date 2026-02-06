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
    challengeSubmissions: '/challenges/:challengeId/submissions',
    learningPaths: '/learning-paths',
    
    /* ======================
   * USER / AREA PERSONALE
   * ====================== */
  me: {
    contributions: '/me/contributi',
  },


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
}
