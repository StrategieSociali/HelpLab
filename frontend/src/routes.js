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
   * EVENTI
   *
   * REGOLA: le route usano sempre lo slug dalla response BE.
   * Mai costruire lo slug dal nome lato client.
   * Il BE lo rigenera automaticamente ad ogni PATCH del nome.
   * ====================== */
  events: {
    list:      '/eventi',
    detail:    (slug = ':slug') => `/eventi/${slug}`,
    live:      (slug = ':slug') => `/eventi/${slug}/live`,
    mine:      '/me/eventi',
    create:    '/dashboard/eventi/crea',
    edit:      (id = ':id') => `/dashboard/eventi/${id}/modifica`,
    adminList: '/dashboard/admin/eventi',
  },

  /* ======================
   * CHALLENGES & LEARNING
   * ====================== */
  dashboard: {
    challenges:      '/challenges',
    challengeSubmit: '/challenges/:id/submit',
    challengeLive:   (id = ':id') => `/challenges/${id}/live`,
    learningPaths:   '/learning-paths',
    userProfile:     '/dashboard/profile',
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
    dashboard:        '/judge',
    challengeOverview: (id = ':id') => `/judge/challenges/${id}`,
  },

  /* ======================
   * ADMIN
   * ====================== */
  admin: {
    proposals:   '/dashboard/admin/proposals',
    assignJudge: '/dashboard/admin/assign-judge',
    events:      '/dashboard/admin/eventi',
  },
  admin: {
  proposals:    '/dashboard/admin/proposals',
  assignJudge:  '/dashboard/admin/assign-judge',
  learningPaths: '/dashboard/admin/corsi',   // ← aggiungi questa
},

  /* ======================
   * MISC
   * ====================== */
  roadmap:  '/roadmap',
  privacy:  '/privacy',
  notFound: '*',
};
