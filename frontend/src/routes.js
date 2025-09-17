// src/routes.js
export const routes = {
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    // pubbliche (liste)
    challenges: '/challenges',
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
  home: '/',
  joinHelpLab: '/unisciti',
  notFound: '*',
};

