export const routes = {
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    challenges: '/challenges',
    learningPaths: '/learning-paths',
    userProfile: '/userprofile',
    challengeCreate: "/challenges/new",
  },
  home: '/',
  joinHelpLab: '/unisciti', // Cambiare in community con il backend
  notFound: '*', // Gestione della 404 pagina
};
