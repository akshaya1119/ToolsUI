import React, { useState, useEffect } from "react";
import { Button, Modal, Select, message, Radio, Space, Checkbox, Alert, Typography } from "antd";
import API from "../../hooks/api";
import axios from "axios";

const url = import.meta.env.VITE_API_BASE_URL;

const ImportConfig = ({ onImport, disabled }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [importMethod, setImportMethod] = useState("project"); // "project" or "groupType"

  // Project Options
  const [projectList, setProjectList] = useState([]);
  const [projectNames, setProjectNames] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Group/Type Options
  const [groupOptions, setGroupOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [importTemplates, setImportTemplates] = useState(true);
  const [configuredProjectIds, setConfiguredProjectIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [templatesExist, setTemplatesExist] = useState(null);
  const [masterConfigExists, setMasterConfigExists] = useState(null);

  const fetchAllProjects = async () => {
    const pageSize = 200;
    let page = 1;
    let collected = [];

    while (true) {
      const res = await API.get(`/Projects?page=${page}&pageSize=${pageSize}`);
      const data = res.data?.data || [];
      collected = collected.concat(data);
      const total = res.data?.totalRecords ?? data.length;
      if (data.length === 0 || page * pageSize >= total) {
        break;
      }
      page += 1;
    }

    return collected;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const promises = [];

      // Fetch Projects if needed
      if (projectList.length === 0 || projectNames.length === 0) {
        promises.push(
          fetchAllProjects()
            .then((data) => setProjectList(data || []))
            .catch(() => message.error("Failed to load project list")),
          axios.get(`${url}/Project`).then(res => setProjectNames(res.data || [])).catch(() => message.error("Failed to load project names"))
        );
      }

      // Fetch Groups and Types if needed
      if (groupOptions.length === 0 || typeOptions.length === 0) {
        promises.push(
          axios.get(`${url}/Groups`).then(res => {
            setGroupOptions((res.data || []).map(g => ({ label: g.name || g.groupName, value: g.id || g.groupId })));
          }).catch(() => message.error("Failed to load groups")),
          axios.get(`${url}/PaperTypes`).then(res => {
            setTypeOptions((res.data || []).map(t => ({ label: t.types, value: t.typeId })));
          }).catch(() => message.error("Failed to load paper types"))
        );
      }

      // Fetch all project configurations to identify configured projects
      promises.push(
        API.get("/ProjectConfigs")
          .then(res => {
            const ids = (res.data || []).map(c => c.projectId);
            setConfiguredProjectIds(ids);
          })
          .catch(() => console.warn("Failed to load project configurations for filtering"))
      );

      await Promise.allSettled(promises);
    } catch (err) {
      console.error("Error fetching import data", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time validation for templates and master config
  useEffect(() => {
    const validateSource = async () => {
      setTemplatesExist(null);
      setMasterConfigExists(null);

      if (importMethod === "project" && selectedProjectId) {
        setValidationLoading(true);
        try {
          // Check templates
          if (importTemplates) {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/RPTTemplates/by-group?projectId=${selectedProjectId}`);
            setTemplatesExist(res.data && res.data.length > 0);
          }
          // Configuration existence is already filtered in dropdown, but we could double check here if needed
          setMasterConfigExists(true); 
        } catch (err) {
          console.error("Validation failed", err);
        } finally {
          setValidationLoading(false);
        }
      } else if (importMethod === "groupType" && selectedGroup && selectedType) {
        setValidationLoading(true);
        try {
          // Check Master Config
          const configRes = await API.get(`/MProjectConfigs/ByTypeGroup/${selectedType}/${selectedGroup}`).catch(() => null);
          setMasterConfigExists(!!configRes?.data);

          // Check templates
          if (importTemplates) {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/RPTTemplates/by-group?typeId=${selectedType}&groupId=${selectedGroup}`);
            setTemplatesExist(res.data && res.data.length > 0);
          }
        } catch (err) {
          console.error("Validation failed", err);
        } finally {
          setValidationLoading(false);
        }
      }
    };

    validateSource();
  }, [importMethod, selectedProjectId, selectedGroup, selectedType, importTemplates]);

  const showModal = () => {
    fetchData();
    setIsModalVisible(true);
  };

  const handleOk = () => {
    if (importMethod === "project") {
      if (!selectedProjectId) {
        message.warning("Please select a project to import from.");
        return;
      }
      onImport({ projectId: selectedProjectId, importTemplates });
    } else {
      if (!selectedGroup || !selectedType) {
        message.warning("Please select both a group and a type to import from.");
        return;
      }
      onImport({ groupId: selectedGroup, typeId: selectedType, importTemplates });
    }

    setIsModalVisible(false);
    // Reset selections on successful import
    setSelectedProjectId(null);
    setSelectedGroup(null);
    setSelectedType(null);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const getDisplayName = (projectId) => {
    const matchedProject = (Array.isArray(projectNames) ? projectNames : []).find((p) => p.projectId === projectId);
    return matchedProject ? matchedProject.name : `Project ${projectId}`;
  };

  return (
    <>
      <Button type="primary" onClick={showModal} disabled={disabled}>
        Import Configuration
      </Button>

      <Modal
        title="Import Configuration"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Import"
        confirmLoading={loading}
        okButtonProps={{
          disabled: importMethod === "project" ? !selectedProjectId : (!selectedGroup || !selectedType)
        }}
      >
        <p>Select a source to import configuration. This will overwrite any unsaved changes.</p>

        <div style={{ marginBottom: 16, marginTop: 16 }}>
          <Radio.Group
            value={importMethod}
            onChange={(e) => setImportMethod(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="project">By Project</Radio.Button>
            <Radio.Button value="groupType">By Group & Type</Radio.Button>
          </Radio.Group>
        </div>

        {importMethod === "project" ? (
          <div>
            <label>Select Project:</label>
            <Select
              style={{ width: "100%", marginTop: 8 }}
              placeholder="Select a project"
              showSearch
              optionFilterProp="children"
              onChange={(value) => setSelectedProjectId(value)}
              value={selectedProjectId}
              loading={loading}
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {(Array.isArray(projectList) ? projectList : [])
                .filter(p => configuredProjectIds.includes(p.projectId))
                .map((project) => (
                <Select.Option
                  key={project.projectId}
                  value={project.projectId}
                >
                  {getDisplayName(project.projectId)}
                </Select.Option>
              ))}
            </Select>
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
            <div>
              <label>Select Group:</label>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                placeholder="Select a group"
                showSearch
                optionFilterProp="label"
                onChange={(value) => setSelectedGroup(value)}
                value={selectedGroup}
                options={groupOptions}
                loading={loading}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <label>Select Type:</label>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                placeholder="Select a type"
                showSearch
                optionFilterProp="label"
                onChange={(value) => setSelectedType(value)}
                value={selectedType}
                options={typeOptions}
                loading={loading}
              />
            </div>
          </Space>
        )}

        <div style={{ marginTop: 20 }}>
          {importMethod === "groupType" && selectedGroup && selectedType && masterConfigExists === false && (
            <Alert
              message="No Master Configuration found for this Group & Type."
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {importTemplates && templatesExist === false && (
            <Alert
              message="No Templates found for this source. Templates will not be imported."
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}
        </div>

        <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Checkbox
            checked={importTemplates}
            onChange={(e) => setImportTemplates(e.target.checked)}
          >
            Import Templates (RPT) from source
          </Checkbox>
          <p style={{ color: '#8c8c8c', fontSize: '12px', marginTop: 4, marginLeft: 24 }}>
            Ensures all report designs are also synchronized with the source.
          </p>
        </div>
      </Modal>
    </>
  );
};

export default ImportConfig;
