import { create } from 'zustand';
import API from '../hooks/api';

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
      set({ permissions: {}, roleId: null, roleName: '', isSuperuser: false, initialized: true });
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await API.get('/Permissions/my-permissions');
      const data = res.data || {};

      set({
        permissions: data.modules || {},
        roleId: data.roleId || null,
        roleName: data.roleName || '',
        isSuperuser: !!data.isSuperuser,
        loading: false,
        initialized: true
      });
    } catch (err) {
      console.warn('Failed to fetch user permissions from ToolsAPI, using fallback:', err?.message || err);
      set({ loading: false, initialized: true, error: err });
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

    // Safety fail-safe: Role 1 Developer always maintains access to Roles & Permissions Admin
    if (state.isSuperuser && moduleCode === 'ROLES_PERMISSIONS') {
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
