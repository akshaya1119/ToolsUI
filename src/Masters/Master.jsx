import React from 'react';
import { FaProjectDiagram, FaBoxes, FaEnvelope, FaLayerGroup, FaCogs, FaCloudSun, FaWrench} from 'react-icons/fa'; // Filled icons from FontAwesome
import { Tabs, Typography  } from 'antd';
import BoxCapacity from './BoxCapacity'; // adjust the path if needed
import EnvelopeType from './EnvelopeType';
import Field from './Field';
import ToolsModule from './ToolsModule';
import NodalUnivExtra from './NodalUnivExtra';
import Project from './Project';
import MasterConfig from './MasterConfig';
import RPTFiles from './RPTFiles';
import { HiTemplate } from "react-icons/hi";
import { SafetyCertificateOutlined } from '@ant-design/icons';
import usePermissionsStore from '../stores/UserPermissions';
import RolesPermissions from './RolesPermissions';

const Master = () => {
  const permissions = usePermissionsStore((state) => state.permissions);
  const hasPermission = usePermissionsStore((state) => state.hasPermission);

  const allTabItems = [
    {
      key: '1',
      visible: hasPermission('MASTER_PROJECT', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaProjectDiagram style={{ color: '#1890ff', marginRight: 8 }} /> 
          <span>Project</span>
        </span>
      ),
      children: <Project />,
    },
    {
      key: '1.5',
      visible: hasPermission('MASTER_CONFIG', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaWrench style={{ color: '#1890ff', marginRight: 8 }} /> <span>Master Configuration</span>
        </span>
      ),
      children: <MasterConfig />
    },
    {
      key: '2',
      visible: hasPermission('MASTER_BOX_CAPACITY', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaBoxes style={{ color: '#1890ff', marginRight: 8 }} /> <span>Box Capacity</span>
        </span>
      ),
      children: <BoxCapacity />,
    },
    {
      key: '3',
      visible: hasPermission('MASTER_ENVELOPE', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaEnvelope style={{ color: '#1890ff', marginRight: 8 }} /> <span>Envelope Type</span> 
        </span>
      ),
      children: <EnvelopeType />,
    },
    {
      key: '4',
      visible: hasPermission('MASTER_FIELDS', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaLayerGroup style={{ color: '#1890ff', marginRight: 8 }} /> <span> Field</span>
        </span>
      ),
      children: <Field />,
    },
    {
      key: '5',
      visible: hasPermission('MASTER_MODULES', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaCogs style={{ color: '#1890ff', marginRight: 8 }} /> <span>Tools Module</span> 
        </span>
      ),
      children: <ToolsModule />,
    },
    {
      key: '6',
      visible: hasPermission('MASTER_NODAL_EXTRA', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaCloudSun style={{ color: '#1890ff', marginRight: 8 }} /> <span>Nodal Univ Extra</span> 
        </span>
      ),
      children: <NodalUnivExtra />
    },
    {
      key: '7',
      visible: hasPermission('MASTER_RPT', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}> 
        <HiTemplate style={{ color: '#1890ff', marginRight: 8 }} />RPT Templates </span>
      ),
      children: <RPTFiles />
    },
    {
      key: '8',
      visible: hasPermission('ROLES_PERMISSIONS', 'View'),
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <SafetyCertificateOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          <span>Roles & Permissions</span>
        </span>
      ),
      children: <RolesPermissions />
    },
  ];

  const tabItems = allTabItems.filter((t) => t.visible);

  return (
    <div style={{ padding: 0 }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Masters
      </Typography.Title>
      {tabItems.length === 0 ? (
        <div style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #ffd591' }}>
          <p style={{ color: '#d46b08', margin: 0, fontWeight: 500 }}>
            Access Denied: You do not have permission to view any Masters modules.
          </p>
        </div>
      ) : (
        <Tabs 
          defaultActiveKey={tabItems[0]?.key || '1'} 
          items={tabItems}
          size="large"
          type="card"
        />
      )}
    </div>
  );
};

export default Master;
