import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import useModulePermission from '../hooks/useModulePermission';

const PermissionRoute = ({ moduleCode, children }) => {
  const navigate = useNavigate();
  const { canView } = useModulePermission(moduleCode);

  if (!canView) {
    return (
      <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <Result
          status="403"
          title="Access Restricted"
          subTitle="You do not have permission to view this module. Please contact your administrator if you need access."
          extra={
            <Button type="primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  return children;
};

export default PermissionRoute;
