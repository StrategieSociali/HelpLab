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
    sponsors:           '/sponsors',
    sponsorProfile:     (id = ':id') => `/sponsors/${id}`,
    sponsorEdit:        '/dashboard/sponsor',
    // Guida pubblica alla sponsorizzazione (accessibile senza login)
    sponsorGuide:       '/sponsorizza',
    // Form candidatura: raggiungibile dalla guida o dal dettaglio challenge
    sponsorshipRequest: (challengeId = '') =>
      challengeId
        ? `/dashboard/sponsor/candidatura?challenge=${challengeId}`
        : `/dashboard/sponsor/candidatura`,
    // Dashboard personale dello sponsor: lista candidature e stati pagamento
    mySponsorships:     '/dashboard/sponsor/candidature',
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
    learningPaths: '/dashboard/admin/corsi',
    sponsorships: '/dashboard/admin/sponsorships',
    // Report evento: percorso con ID dinamico
    eventReport:  (id = ':id') => `/dashboard/admin/events/${id}/report`,
},

  /* ======================
   * MISC
   * ====================== */
  roadmap:  '/roadmap',
  privacy:  '/privacy',
  notFound: '*',
};
