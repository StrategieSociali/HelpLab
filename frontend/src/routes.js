// src/routes.js
export const routes = {
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    // pubbliche
    challenges: '/challenges',
    challengeSubmissions: '/challenges/:challengeId/submissions',
    learningPaths: '/learning-paths',


    // protette (utenti loggati)
    userProfile: '/dashboard/profile',
    challengeCreate: '/dashboard/challenges/create',
  },
  
   // sezione business
  business: {
    root: '/business',
    packages: '/business/packages', // ✅ sezione imprese
  },
  
   roadmap: '/roadmap',

  // sezione admin (protetta + role=admin)
  admin: {
    proposals: '/dashboard/admin/proposals',      // gestione proposte
    assignJudge: '/dashboard/admin/assign-judge', // ✅ assegnazione giudici
  },
  
  //rotta giudici
 judge: {
    moderation: '/modera',
  },


  // sezione home e community
  home: '/',
  joinHelpLab: '/unisciti',
  notFound: '*',
  leaderboard: '/leaderboard',
  info: '/benvenuto',
};

