import { create } from 'zustand';
import useStore from './ProjectData';

const USER_TOKEN_KEY = 'token';

const useUserTokenStore = create((set) => ({
  token: localStorage.getItem(USER_TOKEN_KEY) || "",

  setToken: (newToken) => {
    localStorage.setItem(USER_TOKEN_KEY, newToken);
    set({ token: newToken });
  },

  clearToken: () => {
    localStorage.clear();
    sessionStorage.clear();
    useStore.getState().resetProject();
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
