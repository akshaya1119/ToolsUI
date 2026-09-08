import React, { useState, useEffect } from "react";
import { Typography, Card, Tabs, Upload, Button, Select, Table, Tag, Row, Col, Popover, Checkbox, Tooltip, Input, Form, Modal, Popconfirm, Space, InputNumber } from "antd";
import { UploadOutlined, DownOutlined, UpOutlined, CheckCircleOutlined, SettingOutlined, SearchOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx-js-style";
import API from "../hooks/api";
import { useToast } from "../hooks/useToast";
import useStore from "../stores/ProjectData";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const EditableCell = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) => {
  const inputNode = inputType === 'number' ? <InputNumber style={{width:'100%'}} /> : <Input />;
  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

export default function NodalCenterList() {
  const { showToast } = useToast();
  const projectId = useStore((state) => state.projectId);

  const [activeTab, setActiveTab] = useState("1");
  const [availableDbFields, setAvailableDbFields] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fileData, setFileData] = useState([]);
  const [mapping, setMapping] = useState({});
  const [uploading, setUploading] = useState(false);

  const [existingData, setExistingData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isUploadSectionVisible, setIsUploadSectionVisible] = useState(false);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [sorter, setSorter] = useState({ field: null, order: null });
  const [searchText, setSearchText] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState('');

  const [addedFields, setAddedFields] = useState([]);

  const catchListFields = [
    "CatchNo", "CollegeCode", "CollegeName", "PaperCode", "CourseName", "SubjectName", "NRQuantity", "ExamDate", "ExamTime",
    "Transgender", "Male", "Female", "Semester"
  ];
  const requiredCatchListFields = ["CatchNo", "NRQuantity"];

  const nodalListFields = [
    "CollegeCode", "CollegeName", "ExamCenterCode", "ExamCenterName",
    "Gender", "NodalCode", "NodalName"
  ];
  const requiredNodalListFields = ["NodalCode", "CollegeCode"];

  const currentFields = activeTab === "1" ? catchListFields : nodalListFields;
  const currentRequiredFields = activeTab === "1" ? requiredCatchListFields : requiredNodalListFields;

  useEffect(() => {
    if (projectId) {
      fetchAvailableDbFields();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchExistingData();
    }
  }, [projectId, activeTab, pagination.current, pagination.pageSize, sorter.field, sorter.order, searchText, columnFilters]);

  const fetchAvailableDbFields = async () => {
    try {
      const res = await API.get("/Fields");
      // res.data is likely an array of { fieldId, name } or similar
      const fields = res.data.map(f => f.name || f.Name || f);
      setAvailableDbFields(fields);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch available fields", "error");
    }
  };

  useEffect(() => {
    // Reset added fields to just required fields when tab changes
    setAddedFields([...currentRequiredFields]);
  }, [activeTab]);

  const fetchExistingData = async () => {
    setLoadingData(true);
    try {
      const endpoint = activeTab === "1" ? `/CatchLists/${projectId}` : `/NodalLists/${projectId}`;
      const params = {
        pageNo: pagination.current,
        pageSize: pagination.pageSize,
        search: searchText || null,
        sortField: sorter.field || null,
        sortOrder: sorter.order || null,
        columnFilters: Object.keys(columnFilters).length > 0 ? JSON.stringify(columnFilters) : null,
      };

      const res = await API.get(endpoint, { params });
      
      const data = res.data?.items || [];
      const totalCount = res.data?.totalCount || 0;
      
      let dynamicKeysSet = new Set();
      const processedData = data.map(item => {
        let parsedDynamic = {};
        const dynamicJsonStr = activeTab === "1" ? item.nrDatas : item.otherFields;
        if (dynamicJsonStr) {
          try {
             parsedDynamic = JSON.parse(dynamicJsonStr);
             Object.keys(parsedDynamic).forEach(k => dynamicKeysSet.add(k));
          } catch(e) {}
        }
        return { ...item, ...parsedDynamic };
      });
      
      const dynamicFieldsArr = Array.from(dynamicKeysSet);
      setDynamicFields(dynamicFieldsArr);
      
      // By default, dynamic fields are NOT visible, only standard fields are
      if (visibleColumns.length === 0) {
        const activeColumns = currentFields.filter(col => {
            const dataIndex = col.charAt(0).toLowerCase() + col.slice(1);
            return processedData.some(item => item[dataIndex] !== null && item[dataIndex] !== undefined && item[dataIndex] !== '');
        });
        setVisibleColumns(activeColumns.length > 0 ? activeColumns : currentFields);
      }
      
      setExistingData(processedData);
      setPagination(prev => ({ ...prev, total: totalCount }));
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch existing data", "error");
    } finally {
      setLoadingData(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setVisibleColumns([]);
    setPagination({ current: 1, pageSize: 10, total: 0 });
    setSorter({ field: null, order: null });
    setSearchText("");
    setColumnFilters({});
    resetUploadState();
  };

  const resetUploadState = () => {
    setFileList([]);
    setFileHeaders([]);
    setFileData([]);
    setMapping({});
    setAddedFields([...(activeTab === "1" ? requiredCatchListFields : requiredNodalListFields)]);
  };

  const beforeUpload = (file) => {
    setFileList([file]);
    handleFileUpload(file);
    return false; 
  };

  const onRemove = () => {
    resetUploadState();
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length > 0) {
          const headers = jsonData[0];
          setFileHeaders(headers);
          
          const dataRows = XLSX.utils.sheet_to_json(worksheet);
          setFileData(dataRows);

          // Auto map exact matches and add them to addedFields
          const initialMapping = {};
          const matchedFields = new Set(currentRequiredFields);

          headers.forEach(header => {
            // Only auto-map standard fields (currentFields), NOT availableDbFields. 
            // This prevents unexpected dynamic fields from being auto-mapped.
            const matchedField = currentFields.find(f => f.toLowerCase() === header.toLowerCase().replace(/\s/g, ''));
            if (matchedField) {
              initialMapping[matchedField] = header;
              matchedFields.add(matchedField);
            }
          });
          setMapping(initialMapping);
          setAddedFields(Array.from(matchedFields));
        } else {
          showToast("File is empty", "error");
        }
      } catch (error) {
        showToast("Error reading file", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMappingChange = (modelField, fileHeader) => {
    setMapping(prev => {
      const updated = { ...prev };
      if (!fileHeader) {
         delete updated[modelField];
      } else {
         updated[modelField] = fileHeader;
      }
      return updated;
    });
  };

  const handleUpload = async () => {
    if (!projectId) {
      showToast("Project ID is missing", "error");
      return;
    }
    
    if (fileData.length === 0) {
      showToast("No data to upload", "warning");
      return;
    }

    // Validate required fields
    for (let reqField of currentRequiredFields) {
      if (!mapping[reqField]) {
        showToast(`Please map the required field: ${reqField}`, "error");
        return;
      }
    }

    setUploading(true);

    try {
      const mappedData = fileData.map(row => {
        const newRow = {};
        // Map ONLY fields explicitly added by user in the mapping UI
        Object.keys(mapping).forEach(modelField => {
          const fileHeader = mapping[modelField];
          if (fileHeader && row[fileHeader] !== undefined) {
            newRow[modelField] = row[fileHeader];
          }
        });

        return newRow;
      });

      const endpoint = activeTab === "1" ? "/CatchLists/Upload" : "/NodalLists/Upload";
      
      const response = await API.post(endpoint, {
        projectId: projectId,
        data: mappedData
      });

      showToast(response.data.message || "Upload successful", "success");
      resetUploadState();
      setIsUploadSectionVisible(false);
      fetchExistingData(); 
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const allAvailableColumns = [...currentFields, ...dynamicFields];
  
  const baseColumns = allAvailableColumns
    .filter(col => visibleColumns.includes(col))
    .map(col => {
      const isStandardField = currentFields.includes(col);
      const dataIndex = isStandardField ? (col.charAt(0).toLowerCase() + col.slice(1)) : col;
      
      const colDef = {
        title: col,
        dataIndex: dataIndex,
        key: col,
        sorter: true,
        editable: isStandardField,
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <div style={{ padding: 8 }}>
            <Input
              placeholder={`Search ${col}`}
              value={selectedKeys[0]}
              onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
              onPressEnter={() => confirm()}
              style={{ width: 188, marginBottom: 8, display: 'block' }}
            />
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                icon={<SearchOutlined />}
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
              <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
                Reset
              </Button>
            </Space>
          </div>
        ),
        filterIcon: (filtered) => (
          <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
        ),
      };

      if (["CourseName", "SubjectName", "CollegeName", "ExamCenterName", "NodalName"].includes(col)) {
         colDef.render = (text) => (
           <Tooltip title={text} placement="topLeft">
             <div style={{ maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
               {text}
             </div>
           </Tooltip>
         );
      }

      return colDef;
    });

  const isEditing = (record) => record.id === editingKey;
  const edit = (record) => {
    form.setFieldsValue({ ...record });
    setEditingKey(record.id);
  };
  const cancel = () => {
    setEditingKey('');
  };
  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...existingData];
      const index = newData.findIndex((item) => key === item.id);

      if (index > -1) {
        const item = newData[index];
        const updatedItem = { ...item, ...row };
        
        const endpoint = activeTab === "1" ? `/CatchLists/${key}` : `/NodalLists/${key}`;
        await API.put(endpoint, updatedItem);

        newData.splice(index, 1, updatedItem);
        setExistingData(newData);
        setEditingKey('');
        showToast("Record updated successfully", "success");
      }
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
    }
  };

  baseColumns.push({
    title: 'Action',
    dataIndex: 'operation',
    fixed: 'right',
    render: (_, record) => {
      const editable = isEditing(record);
      return editable ? (
        <Space size="middle">
          <Typography.Link onClick={() => save(record.id)}>Save</Typography.Link>
          <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
            <a>Cancel</a>
          </Popconfirm>
        </Space>
      ) : (
        <Typography.Link disabled={editingKey !== ''} onClick={() => edit(record)}>
          Edit
        </Typography.Link>
      );
    },
  });

  const mergedColumns = baseColumns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: ['NRQuantity', 'Transgender', 'Male', 'Female', 'CollegeCode', 'NodalCode', 'ExamCenterCode'].includes(col.key) ? 'number' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const handleColumnVisibilityChange = (checkedValues) => {
    setVisibleColumns(checkedValues);
  };

  const columnVisibilityContent = (
    <Checkbox.Group 
       options={allAvailableColumns.map(col => ({ label: col, value: col }))} 
       value={visibleColumns} 
       onChange={handleColumnVisibilityChange}
       className="flex flex-col gap-2 max-h-60 overflow-y-auto"
    />
  );

  const handleTableChange = (newPagination, filters, newSorter) => {
    const activeFilters = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key].length > 0) {
          activeFilters[key] = filters[key][0]; // Extract the first string value
        }
      });
    }
    setColumnFilters(activeFilters);

    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize
    }));
    setSorter({
      field: newSorter.field || null,
      order: newSorter.order || null
    });
  };

  const handleSearch = (value) => {
    setPagination(prev => ({ ...prev, current: 1 }));
    setSearchText(value);
  };

  const getRemainingFields = () => {
    // Combine current model fields with DB fields to ensure we don't miss anything, then filter out already added
    const allPossibleFields = Array.from(new Set([...currentFields, ...availableDbFields]));
    return allPossibleFields.filter(f => !addedFields.includes(f));
  };

  const renderMappingSection = () => {
    return (
      <Card
        title="Field Mapping"
        className="mt-4"
        extra={
          // Allow user to add any field or custom field
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Select
              style={{ width: 220 }}
              placeholder="+ Add Field to Map"
              value={[]}
              mode="tags"
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={(value) => {
                if (value && value.length > 0) {
                  const newField = value[value.length - 1]; // get the last added tag
                  if (newField) {
                     setAddedFields(prev => {
                       if (prev.includes(newField)) return prev;
                       return [...prev, newField];
                     });
                  }
                }
              }}
            >
              {getRemainingFields().map(f => (
                <Select.Option key={f} value={f}>
                  {f}
                </Select.Option>
              ))}
            </Select>
          </div>
        }
        styles={{ body: { paddingTop: 12, paddingBottom: 12 } }}
        style={{
          border: "1px solid #d9d9d9",
          boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Map fields from your file to expected fields (Required fields are shown by default)
        </Text>

        <Row gutter={[16, 16]}>
          {[...addedFields]
            .sort((a, b) => {
              const aReq = currentRequiredFields.includes(a);
              const bReq = currentRequiredFields.includes(b);
              if (aReq && !bReq) return -1;
              if (!aReq && bReq) return 1;
              return 0;
            })
            .map((field) => (
              <Col key={field} xs={24} md={8}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Text
                      style={{
                        marginRight: 8,
                        color: mapping[field] ? "#006400" : "inherit",
                      }}
                    >
                      {field}
                      {currentRequiredFields.includes(field) && (
                        <span style={{ color: "#ff4d4f", marginLeft: 2 }}>*</span>
                      )}
                    </Text>
                    {mapping[field] && (
                      <CheckCircleOutlined style={{ color: "#006400", fontSize: 16 }} />
                    )}
                  </div>
                  <Select
                    style={{
                      width: "100%",
                      borderColor: mapping[field] ? "#006400" : undefined,
                      boxShadow: mapping[field] ? "0 0 5px #006400" : undefined,
                    }}
                    placeholder="Select matching column from file"
                    value={mapping[field]}
                    onChange={(value) => handleMappingChange(field, value)}
                    allowClear
                    onClear={() => {
                      handleMappingChange(field, undefined);
                      if (!currentRequiredFields.includes(field)) {
                        setAddedFields(prev => prev.filter(f => f !== field));
                      }
                    }}
                  >
                    {fileHeaders
                      .filter(
                        (header) =>
                          !Object.values(mapping).includes(header) ||
                          mapping[field] === header
                      )
                      .map((header, index) => (
                        <Select.Option key={`${header}-${index}`} value={header}>
                          {header}
                        </Select.Option>
                      ))}
                  </Select>
                </div>
              </Col>
            ))}
        </Row>
      </Card>
    );
  };

  const renderUploadSection = (title) => (
    <div className="flex flex-col gap-4 mt-2">
      {isUploadSectionVisible && (
        <Card 
          className="shadow-sm border-gray-200" 
          title={title} 
          extra={<Button type="text" onClick={() => setIsUploadSectionVisible(false)}>Close</Button>}
        >
          <div className="flex flex-col gap-4">
            <Upload.Dragger
              fileList={fileList}
              beforeUpload={beforeUpload}
              onRemove={onRemove}
              accept=".xls,.xlsx,.csv"
              maxCount={1}
            >
              <p className="ant-upload-text">Upload Excel or CSV file</p>
              <Button icon={<UploadOutlined />}>Choose File</Button>
            </Upload.Dragger>

            {fileHeaders.length > 0 && (
              <div className="mt-4">
                {renderMappingSection()}
                <div className="mt-4 flex justify-end">
                  <Button
                    type="primary"
                    onClick={handleUpload}
                    loading={uploading}
                    disabled={uploading}
                  >
                    Upload Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Existing Data Table */}
      <Card className="shadow-sm border-gray-200">
         <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-2">
             <Typography.Title level={5} className="mb-0">Uploaded Data</Typography.Title>
             <Tag color="blue">{pagination.total} Records</Tag>
           </div>
           <div className="flex gap-4 items-center">
             <Input.Search 
               placeholder="Search table..." 
               onSearch={handleSearch} 
               style={{ width: 250 }}
               allowClear
             />
             {!isUploadSectionVisible && (
               <Button type="primary" onClick={() => setIsUploadSectionVisible(true)}>
                   {title}
               </Button>
             )}
             <Popover content={columnVisibilityContent} title="Column Visibility" trigger="click" placement="bottomRight">
               <Button icon={<SettingOutlined />}>Columns</Button>
             </Popover>
           </div>
         </div>
         <Form form={form} component={false}>
           <Table
              components={{
                body: {
                  cell: EditableCell,
                },
              }}
              dataSource={existingData}
              columns={mergedColumns}
              loading={loadingData}
              rowKey="id"
              size="small"
              scroll={{ x: 'max-content' }}
              pagination={pagination}
              onChange={handleTableChange}
              rowClassName="editable-row"
           />
         </Form>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      <Title level={4} className="mb-6">Nodal Center List</Title>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
        tabBarStyle={{ paddingLeft: '16px' }}
      >
        <TabPane tab="Add Catch List" key="1">
          {renderUploadSection("Upload Catch List")}
        </TabPane>
        <TabPane tab="Add Nodal List" key="2">
          {renderUploadSection("Upload Nodal List")}
        </TabPane>
      </Tabs>
    </div>
  );
}
