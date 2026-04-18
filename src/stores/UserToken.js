import { create } from 'zustand';

const USER_TOKEN_KEY = 'token';

const useUserTokenStore = create((set) => ({
  token: localStorage.getItem(USER_TOKEN_KEY) || "",

  setToken: (newToken) => {
    localStorage.setItem(USER_TOKEN_KEY, newToken);
    set({ token: newToken });
  },

  clearToken: () => {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem("cached_groups");
    localStorage.removeItem("cached_all_projects");
    set({ token: "" });
  },

  getToken: () => {
    return localStorage.getItem(USER_TOKEN_KEY);
  },

}));
export const useUserToken = () => useUserTokenStore((state) => state.token);
export const useUserTokenActions = () => {
  const setToken = useUserTokenStore((state) => state.setToken);
  const clearToken = useUserTokenStore((state) => state.clearToken);
  const getToken = useUserTokenStore((state) => state.getToken);
  return { setToken, clearToken, getToken };
};


export default useUserTokenStore;
