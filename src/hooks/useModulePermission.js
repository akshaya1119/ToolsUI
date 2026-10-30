import usePermissionsStore from '../stores/UserPermissions';

/**
 * Hook to retrieve effective permissions for a specific module.
 * @param {string} moduleCode The uppercase module code (e.g. 'DATA_IMPORT', 'MASTER_PROJECT')
 * @returns {{ canView: boolean, canCreate: boolean, canEdit: boolean, canDelete: boolean, canExecute: boolean, canExport: boolean, isSuperuser: boolean }}
 */
export const useModulePermission = (moduleCode) => {
  const isSuperuser = usePermissionsStore((state) => state.isSuperuser);
  const permissions = usePermissionsStore((state) => state.permissions[moduleCode]);
  const initialized = usePermissionsStore((state) => state.initialized);
  const error = usePermissionsStore((state) => state.error);

  // Safety fail-safe: Role 1 Developer always maintains access to Roles & Permissions Admin
  if (isSuperuser && moduleCode === 'ROLES_PERMISSIONS') {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExecute: true,
      canExport: true,
      isSuperuser: true,
      loading: !initialized
    };
  }

  // Safe fallback: If not yet initialized or on error, allow viewing but block mutating actions to prevent privilege leaks
  if (!initialized || error) {
    return {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExecute: false,
      canExport: false,
      isSuperuser,
      loading: !initialized
    };
  }

  // Once initialized, if module is not listed, permissions are false
  if (!permissions) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExecute: false,
      canExport: false,
      isSuperuser,
      loading: false
    };
  }

  const getFlag = (action) => {
    const cap = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
    return !!(permissions[`can${cap}`] ?? permissions[`Can${cap}`] ?? permissions[cap] ?? permissions[action]);
  };

  return {
    canView: getFlag('view'),
    canCreate: getFlag('create'),
    canEdit: getFlag('edit'),
    canDelete: getFlag('delete'),
    canExecute: getFlag('execute'),
    canExport: getFlag('export'),
    isSuperuser,
    loading: false
  };
};

export default useModulePermission;
