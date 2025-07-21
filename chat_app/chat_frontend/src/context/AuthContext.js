// src/context/AuthContext.js
import { createContext } from 'react';

const AuthContext = createContext({
  isAuthenticated: false,
  username: '',
  login: () => {},
  logout: () => {},
});

export default AuthContext;