import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, InputNumber, Space, message } from "antd";
import API from "../hooks/api";

const NodalUnivExtra = () => {
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingExtra, setEditingExtra] = useState(null);


  // Fetch all extras
  const fetchExtras = async () => {
    setLoading(true);
    try {
      const res = await API.get('/ExtraTypes');
      setExtras(res.data);
    } catch (error) {
      message.error("Failed to fetch extras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtras();
  }, []);

  // Open modal for Add/Edit
  const openModal = (record = null) => {
    setEditingExtra(record);
    setIsModalOpen(true);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
  };

  // Save (Add/Edit)
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingExtra) {
        // Update
        await API.put(`/ExtraTypes/${editingExtra.extraTypeId}`, {
          ...editingExtra,
          ...values,
        });
        message.success("Extra updated successfully.");
      } else {
        // Create
        await API.post('/ExtraTypes', values);
        message.success("Extra added successfully.");
      }
      fetchExtras();
      setIsModalOpen(false);
    } catch (error) {
      message.error("Save failed. Please try again.");
    }
  };

  // Table columns
  const columns = [
    {
      title: "ID",
      dataIndex: "extraTypeId",
      key: "extraTypeId",
      width: 80,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Order",
      dataIndex: "order",
      key: "order",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openModal(record)}>
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div >
      
      <Button type="primary" style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }} onClick={() => openModal()}>
        Add Extra
      </Button>

      <Table
        columns={columns}
        dataSource={extras}
        rowKey="extraTypeId"
        loading={loading}
        bordered
      />

      <Modal
        title={editingExtra ? "Edit Extra" : "Add Extra"}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: "Please enter type" }]}
          >
            <Input placeholder="Enter type (e.g., Nodal, University, Office Copy)" />
          </Form.Item>
          <Form.Item
            name="order"
            label="Order"
            rules={[{ required: true, message: "Please enter order" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NodalUnivExtra;
