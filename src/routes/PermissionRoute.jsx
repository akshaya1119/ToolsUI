import React from 'react';
import { Result, Button, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useModulePermission from '../hooks/useModulePermission';
import usePermissionsStore from '../stores/UserPermissions';

const PermissionRoute = ({ moduleCode, moduleCodes, children }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const initialized = usePermissionsStore((state) => state.initialized);
  const loading = usePermissionsStore((state) => state.loading);
  const hasPermission = usePermissionsStore((state) => state.hasPermission);

  const codesToCheck = moduleCodes && Array.isArray(moduleCodes)
    ? moduleCodes
    : (moduleCode ? [moduleCode] : []);

  const canView = codesToCheck.length === 0 || codesToCheck.some((code) => hasPermission(code, 'View'));

  if (!initialized) {
    return (
      <div style={{ padding: '80px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip={t('permission.checkingPermissions', 'Checking permissions...')} />
      </div>
    );
  }

  if (!canView) {
    return (
      <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <Result
          status="403"
          title={t('permission.accessRestricted', 'Access Restricted')}
          subTitle={t(
            'permission.accessRestrictedSubTitle',
            'You do not have permission to view this module. Please contact your administrator if you need access.'
          )}
          extra={
            <Button type="primary" onClick={() => navigate('/dashboard')}>
              {t('permission.backToDashboard', 'Back to Dashboard')}
            </Button>
          }
        />
      </div>
    );
  }

  return children;
};

export default PermissionRoute;
