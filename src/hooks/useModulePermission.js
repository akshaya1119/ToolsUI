import usePermissionsStore from '../stores/UserPermissions';

const isDevOrAdminRole = (roleName, roleId) => {
  if (roleId === 1) return true;
  if (!roleName) return false;
  const lower = String(roleName).toLowerCase();
  return lower.includes('developer') || lower.includes('admin') || lower === 'dev';
};

export const useModulePermission = (moduleCode) => {
  const permissions = usePermissionsStore((state) => state.permissions);
  const isSuperuser = usePermissionsStore((state) => state.isSuperuser);
  const roleName = usePermissionsStore((state) => state.roleName);
  const roleId = usePermissionsStore((state) => state.roleId);
  const initialized = usePermissionsStore((state) => state.initialized);
  const loading = usePermissionsStore((state) => state.loading);

  const isBypass = isSuperuser || isDevOrAdminRole(roleName, roleId);

  // If user is Developer or Admin, grant full access across all modules
  if (isBypass) {
    return {
      canView: true,
      canEdit: true,
      canCreate: true,
      canDelete: true,
      canExecute: true,
      canExport: true,
      loading: false,
      initialized: true,
      isSuperuser: true
    };
  }

  const mod = permissions?.[moduleCode] || {};

  return {
    canView: !!(mod.canView ?? mod.CanView ?? false),
    canEdit: !!(mod.canEdit ?? mod.CanEdit ?? false),
    canCreate: !!(mod.canCreate ?? mod.CanCreate ?? false),
    canDelete: !!(mod.canDelete ?? mod.CanDelete ?? false),
    canExecute: !!(mod.canExecute ?? mod.CanExecute ?? false),
    canExport: !!(mod.canExport ?? mod.CanExport ?? false),
    loading,
    initialized,
    isSuperuser: false
  };
};

export default useModulePermission;
