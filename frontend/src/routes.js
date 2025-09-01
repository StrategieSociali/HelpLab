export const routes = {
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    challenges: '/challenges',
    createChallenge: '/challenges/new',
    learningPaths: '/learning-paths',
    userProfile: '/userprofile',
  },
  home: '/',
  joinHelpLab: '/unisciti', //usata come Community
  notFound: '*', // Gestione della pagina 404
};
