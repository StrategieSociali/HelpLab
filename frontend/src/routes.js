// src/routes.js
export const routes = {
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    // pubbliche (liste)
    challenges: '/challenges',
    createChallenge: '/challenges/new',
    learningPaths: '/learning-paths',

    // protette
    userProfile: '/dashboard/profile',
    challengeCreate: '/dashboard/challenges/create',
  },
  // sezione admin (protetta + role=admin)
  admin: {
    proposals: '/dashboard/admin/proposals',
    // in futuro: assignJudge: '/dashboard/admin/assign-judge/:id'
  },
  business: '/business',
  home: '/',
<<<<<<< HEAD
  joinHelpLab: '/unisciti', //usata come Community
  notFound: '*', // Gestione della pagina 404
=======
  joinHelpLab: '/unisciti',
  notFound: '*',
>>>>>>> release/v0.4.1
};

