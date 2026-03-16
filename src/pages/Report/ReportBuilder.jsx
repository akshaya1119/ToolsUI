import React, { useState, useEffect, useRef } from "react";
import { Card, Input, Checkbox, Button, Table, Typography, Space, Empty, message, Select, Spin } from "antd";
import { SearchOutlined, DragOutlined, ReloadOutlined, DownloadOutlined, EyeOutlined, CloseOutlined } from "@ant-design/icons";
import API from "../../hooks/api";
import axios from "axios";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const { Title, Text } = Typography;
const { Option } = Select;

// Sortable Item Component
const SortableFieldItem = ({ field, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: field.fieldId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 5px",
    background: "#fafafa",
    border: "1px solid #e8e8e8",
    borderRadius: 6
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Space>
        <DragOutlined {...listeners}
  {...attributes} style={{ color: "#1890ff", cursor: "grab" }} />
        <Text strong>{field.name}</Text>
      </Space>

      <Button
        type="text"
        danger
        size="small"
        icon={<CloseOutlined />}
        onClick={() => onRemove(field.fieldId)}
      />
    </div>
  );
};

const ReportBuilder = () => {
  // State management
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [availableFields, setAvailableFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const previewRef = useRef(null);
  const url = import.meta.env.VITE_API_BASE_URL;
  
  // Fetch groups and types on component mount
  useEffect(() => {
    fetchGroups();
    fetchTypes();
  }, []);

  // Fetch modules when group and type are selected
  useEffect(() => {
    if (selectedGroup && selectedType) {
      fetchModules();
    } else {
      setModules([]);
      setSelectedModule(null);
      resetReportBuilder();
    }
  }, [selectedGroup, selectedType]);

  // Fetch fields when module changes
  useEffect(() => {
    if (selectedModule) {
      fetchFields(selectedModule);
    } else {
      setAvailableFields([]);
      resetReportBuilder();
    }
  }, [selectedModule]);

  // Fetch groups from API
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await axios.get(`${url}/Groups`);
      setGroups(response.data);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      message.error("Failed to load groups. Please try again.");
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch types from API
  const fetchTypes = async () => {
    setLoadingTypes(true);
    try {
      const response = await axios.get(`${url}/PaperTypes`);
      setTypes(response.data);
    } catch (error) {
      console.error("Failed to fetch types:", error);
      message.error("Failed to load types. Please try again.");
    } finally {
      setLoadingTypes(false);
    }
  };

  // Fetch modules from API
  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const response = await API.get("/Modules");
      setModules(response.data);
    } catch (error) {
      console.error("Failed to fetch modules:", error);
      message.error("Failed to load modules. Please try again.");
    } finally {
      setLoadingModules(false);
    }
  };

  // Fetch fields from API based on selected module
  const fetchFields = async (moduleId) => {
    setLoadingFields(true);
    try {
      const response = await API.get(`/Fields?moduleId=${moduleId}`);
      setAvailableFields(response.data);
    } catch (error) {
      console.error("Failed to fetch fields:", error);
      message.error("Failed to load fields. Please try again.");
      setAvailableFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

    // Reset report builder state
  const resetReportBuilder = () => {
    setSelectedFields([]);
    setShowPreview(false);
    setPreviewData([]);
    setSearchTerm("");
  };

  // Handle group selection
  const handleGroupChange = (value) => {
    setSelectedGroup(value);
    resetReportBuilder();
  };

  // Handle type selection
  const handleTypeChange = (value) => {
    setSelectedType(value);
    resetReportBuilder();
  };

  // Handle module selection
  const handleModuleChange = (value) => {
    setSelectedModule(value);
    resetReportBuilder();
  };

  // Filter available fields based on search
  const filteredFields = availableFields.filter((field) =>
  field.name.toLowerCase().includes(searchTerm.toLowerCase())
);
  // Check if field is selected
  const isFieldSelected = (fieldId) => selectedFields.some((f) => f.fieldId === fieldId);

  // Handle field selection
  const handleFieldToggle = (field) => {
    if (isFieldSelected(field.fieldId)) {
      setSelectedFields(selectedFields.filter((f) => f.fieldId !== field.fieldId));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    setSelectedFields([...availableFields]);
    message.success("All fields selected");
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedFields([]);
    setShowPreview(false);
    message.info("Selection cleared");
  };

  // Remove field from selected
  const handleRemoveField = (fieldId) => {
    setSelectedFields(selectedFields.filter((f) => f.fieldId !== fieldId));
  };

  // Generate preview
  const handleGeneratePreview = async () => {
  if (selectedFields.length === 0) {
    message.warning("Please select at least one field");
    return;
  }

  setLoadingPreview(true);

  try {
    const fieldIds = selectedFields.map((f) => f.fieldId);

    const response = await API.post("/Reports/Preview", {
      moduleId: selectedModule,
      fieldIds: fieldIds
    });

    setPreviewData(response.data);
    setShowPreview(true);

    message.success("Preview generated");
  } catch (error) {
    console.error(error);
    message.error("Failed to generate preview");
  } finally {
    setLoadingPreview(false);
  }
};

  // Download report
  const handleDownloadReport = async () => {
  if (selectedFields.length === 0) {
    message.warning("Please select at least one field");
    return;
  }

  try {
    const fieldIds = selectedFields.map((f) => f.fieldId);

    const response = await API.post(
      "/Reports/Download",
      {
        moduleId: selectedModule,
        fieldIds: fieldIds
      },
      {
        responseType: "blob"
      }
    );

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Report.xlsx";
    link.click();

    window.URL.revokeObjectURL(url);

    message.success("Report downloaded");
  } catch (error) {
    console.error(error);
    message.error("Download failed");
  }
};

  // Generate table columns for preview
  const previewColumns = selectedFields.map((field) => ({
    title: field.name,
    dataIndex: field.name,
    key: field.fieldId,
  }));

  const handleDragEnd = (event) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  setSelectedFields((items) => {
    const oldIndex = items.findIndex((i) => i.fieldId === active.id);
    const newIndex = items.findIndex((i) => i.fieldId === over.id);

    return arrayMove(items, oldIndex, newIndex);
  });
};

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "calc(100vh - 64px)", 
      overflow: "hidden",
      padding: 10,
      background: "#f0f2f5"
    }}>
      {/* Page Header */}
      <div style={{ 
        marginBottom: 12, 
        flexShrink: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12
      }}>
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
            Report Builder
          </Title>
          
</div>
        {/* Action Buttons */}
        <Space >
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={handleGeneratePreview}
            disabled={selectedFields.length === 0}
            loading={loadingPreview}
          >
            Generate Preview
          </Button>
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={handleDownloadReport}
            disabled={selectedFields.length === 0 }
          >
            Download Report
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleClearSelection}>
            Reset Selection
          </Button>
        </Space>
      </div>

      {/* Panels Section - Fixed Height */}
      <div
  style={{
    display: "flex",
    gap: 16,
    marginBottom: 12,
    flexShrink: 0,
    height: "calc(50vh - 80px)"
  }}
>
<Card
  title="Filters"
  style={{ width: 250 }}
  styles={{
    header: { padding: "10px 10px" },
    body: { padding: "10px 10px" }
  }}
>
        {/* Group, Type, and Module Selection */}
                    <Space wrap>
                      <Space direction="vertical" size={4}>
                        <Text strong>Group:</Text>
                        <Select
                          placeholder="Select group"
                          style={{ width: 200 }}
                          value={selectedGroup}
                          onChange={handleGroupChange}
                          loading={loadingGroups}
                        >
                          {groups.map((group) => (
                            <Option key={group.id ?? group.groupId} value={group.id ?? group.groupId}>
  {group.name ?? group.groupName}
</Option>
                          ))}
                        </Select>
                      </Space>
          
                      <Space direction="vertical" size={4}>
                        <Text strong>Type:</Text>
                        <Select
                          placeholder="Select type"
                          style={{ width: 200 }}
                          value={selectedType}
                          onChange={handleTypeChange}
                          loading={loadingTypes}
                        >
                          {types.map((type) => (
                            <Option key={type.id ?? type.typeId} value={type.id ?? type.typeId}>
  {type.name ?? type.types}
</Option>
                          ))}
                        </Select>
                      </Space>
          
                      <Space direction="vertical" size={4}>
                        <Text strong>Module:</Text>
                        <Select
                          placeholder="Select module"
                          style={{ width: 200 }}
                          value={selectedModule}
                          onChange={handleModuleChange}
                          loading={loadingModules}
                          disabled={!selectedGroup || !selectedType}
                        >
                          {modules.map((module) => (
                            <Option key={module.id ?? module.moduleId} value={module.id ?? module.moduleId}>
  {module.name ?? module.moduleName}
</Option>
                          ))}
                        </Select>
                      </Space>
                    </Space>
                    </Card>
        {/* Available Fields Panel */}
        <Card 
          title="Available Fields" 
          style={{ 
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            header: { padding: "5px 5px" }
          }}
        >
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10
  }}
>
  <Input
    placeholder="Search fields..."
    prefix={<SearchOutlined />}
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    size="small"
    style={{ width: 700 }}
    disabled={!selectedModule || loadingFields}
  />

  <Button
    size="small"
    onClick={handleSelectAll}
    disabled={!selectedModule || loadingFields || availableFields.length === 0}
  >
    Select All
  </Button>

  <Button
    size="small"
    onClick={handleClearSelection}
    disabled={selectedFields.length === 0}
  >
    Clear Selection
  </Button>
</div>

          {loadingFields ? (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Spin tip="Loading fields..." />
            </div>
          ) : !selectedModule ? (
            <Empty
              description="Please select a module to view fields"
              style={{ margin: "auto" }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : availableFields.length === 0 ? (
            <Empty
              description="No fields available for this module"
              style={{ margin: "auto" }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
   <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext
    items={selectedFields.map((f) => f.fieldId)}
    strategy={rectSortingStrategy}
  >
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 5
      }}
    >
      {filteredFields.map((field) => {
  const selected = isFieldSelected(field.fieldId);

  if (selected) {
    return (
      <SortableFieldItem
        key={field.fieldId}
        field={field}
        onRemove={handleRemoveField}
      />
    );
  }

  return (
    <div
      key={field.fieldId}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "5px 5px",
        border: "1px solid #eee",
        borderRadius: 6,
        background: "#fff"
      }}
    >
      <Checkbox
        checked={false}
        onChange={() => handleFieldToggle(field)}
      >
        {field.name}
      </Checkbox>
    </div>
  );
})}
    </div>
  </SortableContext>
</DndContext>
           
          )}
        </Card>
      </div>

      {/* Preview Section - Scrollable */}
      {showPreview && selectedFields.length > 0 && (
        <Card 
          ref={previewRef}
          title="Report Preview" 
          style={{ 
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0
          }}
          styles={{
            body: {
              flex: 1,
              overflow: "auto",
              padding: 10
            }
          }}
        >
          {loadingPreview ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <Spin tip="Generating preview..." />
            </div>
          ) : (
            <Table
              columns={previewColumns}
              dataSource={previewData}
              pagination={false}
              bordered
              scroll={{ x: true }}
              size="small"
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default ReportBuilder;
