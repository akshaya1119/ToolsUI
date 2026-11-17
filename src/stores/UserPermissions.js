import { create } from 'zustand';
import API from '../hooks/api';

const usePermissionsStore = create((set, get) => ({
  permissions: {},
  specialActions: {},
  roleId: null,
  roleName: '',
  isSuperuser: false,
  loading: false,
  error: null,
  initialized: false,

  fetchPermissions: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ permissions: {}, specialActions: {}, roleId: null, roleName: '', isSuperuser: false, initialized: true, loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await API.get('/Permissions/my-permissions');
      const data = res.data || {};

      set({
        permissions: data.modules || {},
        specialActions: data.specialActions || {},
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
      specialActions: {},
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
  },

  /**
   * Evaluates special action permission using the strict 3-tier rule:
   * ALLOW = Parent Module View AND Required Standard Action AND Explicit Special Action Permission
   */
  hasSpecialAction: (actionCode) => {
    const state = get();
    if (!state.initialized || state.error) return false;

    // Known special action mapping: actionCode -> { parentModule, requiredStandardAction }
    const SPECIAL_ACTION_MAP = {
      'ACTION_DELETE_ALL_NR_DATA': { parentModule: 'UPLOADED_DATA', requiredStandardAction: 'Delete' },
      'ACTION_BULK_UPDATE_NR_DATA': { parentModule: 'UPLOADED_DATA', requiredStandardAction: 'Edit' },
      'ACTION_BULK_VERIFY_CATCHES': { parentModule: 'HEADER_VERIFICATION', requiredStandardAction: 'Edit' },
      'ACTION_APPLY_CHANGED_NR': { parentModule: 'CHANGED_NR', requiredStandardAction: 'Execute' },
      'ACTION_PUSH_NODAL_TO_NR': { parentModule: 'NODAL_CATCH', requiredStandardAction: 'Execute' },
      'ACTION_PURGE_REPORT_RECORD': { parentModule: 'REPORT_TEMPLATE_MANAGEMENT', requiredStandardAction: 'Delete' },
    };

    const mapping = SPECIAL_ACTION_MAP[actionCode];
    if (!mapping) return false;

    // Tier 1: Parent Module View
    if (!state.hasPermission(mapping.parentModule, 'View')) return false;

    // Tier 2: Required Standard Action on Parent Module
    if (!state.hasPermission(mapping.parentModule, mapping.requiredStandardAction)) return false;

    // Tier 3: Explicit Special Action Permission
    return !!state.specialActions?.[actionCode];
  }
}));

export default usePermissionsStore;
