import { create } from 'zustand';
import API from '../hooks/api';

const decodeTokenPayload = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('Failed to parse JWT token claims:', err);
    return null;
  }
};

const isDevOrAdminRole = (roleName, roleId) => {
  if (roleId === 1) return true;
  if (!roleName) return false;
  const lower = String(roleName).toLowerCase();
  return lower.includes('developer') || lower.includes('admin') || lower === 'dev';
};

const usePermissionsStore = create((set, get) => ({
  permissions: {},
  roleId: null,
  roleName: '',
  isSuperuser: false,
  loading: false,
  error: null,
  initialized: false,

  fetchPermissions: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ permissions: {}, roleId: null, roleName: '', isSuperuser: false, initialized: true, loading: false });
      return;
    }

    const payload = decodeTokenPayload(token);
    const tokenRoleId = payload?.roleId ?? payload?.RoleId ?? (payload?.role === 'Developer' ? 1 : null);
    const tokenRoleName = payload?.roleName ?? payload?.RoleName ?? payload?.role ?? payload?.Role ?? '';
    const tokenIsDev = isDevOrAdminRole(tokenRoleName, tokenRoleId);

    set({ loading: true, error: null });
    try {
      const res = await API.get('/Permissions/my-permissions');
      const data = res.data || {};

      const roleId = data.roleId || tokenRoleId || null;
      const roleName = data.roleName || tokenRoleName || '';
      const isSuper = !!data.isSuperuser || tokenIsDev || isDevOrAdminRole(roleName, roleId);

      set({
        permissions: data.modules || {},
        roleId,
        roleName,
        isSuperuser: isSuper,
        loading: false,
        initialized: true
      });
    } catch (err) {
      console.warn('Failed to fetch user permissions from ToolsAPI, using token fallback:', err?.message || err);
      set({
        permissions: {},
        roleId: tokenRoleId,
        roleName: tokenRoleName,
        isSuperuser: tokenIsDev,
        loading: false,
        initialized: true,
        error: err
      });
    }
  },

  clearPermissions: () => {
    set({
      permissions: {},
      roleId: null,
      roleName: '',
      isSuperuser: false,
      loading: false,
      error: null,
      initialized: false
    });
  },

  hasPermission: (moduleCode, action = 'View') => {
    const state = get();

    // Superuser / Developer / Admin bypass: full access across all modules
    if (state.isSuperuser || isDevOrAdminRole(state.roleName, state.roleId)) {
      return true;
    }

    // Safe fallback: Allow viewing while initializing or on error, but deny mutating permissions by default
    if (!state.initialized || state.error) {
      return action.toLowerCase() === 'view';
    }

    const mod = state.permissions[moduleCode];
    if (!mod) {
      return false;
    }

    const actionCap = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
    return !!(mod[`can${actionCap}`] ?? mod[`Can${actionCap}`] ?? mod[actionCap] ?? mod[action]);
  }
}));

export default usePermissionsStore;
