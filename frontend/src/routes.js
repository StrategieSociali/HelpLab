export const routes = {
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    challenges: '/challenges',
    learningPaths: '/learning-paths',
    userProfile: '/userprofile',
  },
  home: '/',
  joinHelpLab: '/unisciti', // Cambiare in community con il backend
  notFound: '*', // Gestione della pagina 404
};
