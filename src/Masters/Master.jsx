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
import { HiTemplate } from "react-icons/hi";import ReportBuilder from '../pages/Report/ReportBuilder';
import CrystalReports from './CrystalReports';
import {CopyOutlined, FileTextOutlined} from '@ant-design/icons'
const Master = () => {
  const tabItems = [
    {
      key: '1',
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
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaWrench style={{ color: '#1890ff', marginRight: 8 }} /> <span>Master Configuration</span>
        </span>
      ),
      children: <MasterConfig />
    },
    {
      key: '2',
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaBoxes style={{ color: '#1890ff', marginRight: 8 }} /> <span>Box Capacity</span>
        </span>
      ),
      children: <BoxCapacity />,
    },
    {
      key: '3',
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaEnvelope style={{ color: '#1890ff', marginRight: 8 }} /> <span>Envelope Type</span> 
        </span>
      ),
      children: <EnvelopeType />,
    },
    {
      key: '4',
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaLayerGroup style={{ color: '#1890ff', marginRight: 8 }} /> <span> Field</span>
        </span>
      ),
      children: <Field />,
    },
    {
      key: '5',
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaCogs style={{ color: '#1890ff', marginRight: 8 }} /> <span>Tools Module</span> 
        </span>
      ),
      children: <ToolsModule />,
    },
    {
      key: '6',
      label: (
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <FaCloudSun style={{ color: '#1890ff', marginRight: 8 }} /> <span>Nodal Univ Extra</span> 
        </span>
      ),
      children: <NodalUnivExtra />
    },
    // {
    //   key: '7',
    //   label: (
    //     <span style={{ display: 'flex', alignItems: 'center' }}> 
    //     <HiTemplate style={{ color: '#1890ff', marginRight: 8 }} />RPT Templates </span>
    //   ),
    //   children: <RPTFiles />
    // },
    // {
    //   key: '8',
    //   label: (
    //     <span style={{ display: 'flex', alignItems: 'center' }}>
    //       <CopyOutlined style={{ color: '#1890ff', marginRight: 8 }} /><span>Report Builder</span> 
    //     </span>
    //   ),
    //   children: <ReportBuilder />
    // },
    // {
    //   key: '9',
    //   label: (
    //     <span style={{ display: 'flex', alignItems: 'center' }}>
    //       <FileTextOutlined style={{ color: '#1890ff', marginRight: 8 }} /><span>Crystal Reports</span> 
    //     </span>
    //   ),
    //   children: <CrystalReports />
    // },
  ];

  return (
    <div style={{ padding: 0 }}>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Masters
      </Typography.Title>
      <Tabs 
        defaultActiveKey="1" 
        items={tabItems}
        size="large"
        type="card"
      />
    </div>
  );
};

export default Master;
