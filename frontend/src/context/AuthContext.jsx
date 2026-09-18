import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, signupUser, getMe } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("solocfo_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const userData = await getMe();
          setUser(userData);
        } catch {
          localStorage.removeItem("solocfo_token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    if (data.access_token) {
      localStorage.setItem("solocfo_token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    }
    return data;
  };

  const signup = async (email, password) => {
    const data = await signupUser(email, password);
    if (data.access_token) {
      localStorage.setItem("solocfo_token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem("solocfo_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
