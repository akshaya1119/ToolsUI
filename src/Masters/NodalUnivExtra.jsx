import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, InputNumber, Space, message, Tooltip } from "antd";
import API from "../hooks/api";
import useModulePermission from "../hooks/useModulePermission";

const NodalUnivExtra = () => {
  const { t } = useTranslation();
  const { canView, canCreate, canEdit } = useModulePermission('MASTER_NODAL_EXTRA');
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
      message.error(t('masters.nodalUnivExtra.fetchFailed', "Failed to fetch extras."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchExtras();
    }
  }, [canView]);

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
        message.success(t('common.feedback.updateSuccess', "Extra updated successfully."));
      } else {
        // Create
        await API.post('/ExtraTypes', values);
        message.success(t('common.feedback.addSuccess', "Extra added successfully."));
      }
      fetchExtras();
      setIsModalOpen(false);
    } catch (error) {
      message.error(t('common.feedback.saveFailed', "Save failed. Please try again."));
    }
  };

  // Table columns
  const columns = [
    {
      title: t('masters.nodalUnivExtra.id', "ID"),
      dataIndex: "extraTypeId",
      key: "extraTypeId",
      width: 80,
    },
    {
      title: t('common.labels.type', "Type"),
      dataIndex: "type",
      key: "type",
    },
    {
      title: t('masters.nodalUnivExtra.order', "Order"),
      dataIndex: "order",
      key: "order",
    },
    {
      title: t('common.labels.actions', "Actions"),
      key: "actions",
      render: (_, record) => (
        <Space>
          {canEdit ? (
            <Button type="link" onClick={() => openModal(record)}>
              {t('common.actions.edit', 'Edit')}
            </Button>
          ) : (
            <Tooltip title={t('common.actions.viewOnlyEditDisabled', "View-only access: Editing is disabled")}>
              <span>
                <Button type="link" disabled>
                  {t('common.actions.edit', 'Edit')}
                </Button>
              </span>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (!canView) {
    return (
      <div style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #ffd591' }}>
        <p style={{ color: '#d46b08', margin: 0, fontWeight: 500 }}>
          Access Denied: You do not have permission to view Nodal Univ Extra Master.
        </p>
      </div>
    );
  }

  return (
    <div >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {canCreate ? (
          <Button type="primary" onClick={() => openModal()}>
            {t('masters.nodalUnivExtra.addExtraButton', 'Add Extra')}
          </Button>
        ) : (
          <Tooltip title={t('common.actions.viewOnlyAddDisabled', "View-only access: Creating new items is disabled")}>
            <span>
              <Button type="primary" disabled>
                {t('masters.nodalUnivExtra.addExtraButton', 'Add Extra')}
              </Button>
            </span>
          </Tooltip>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={extras}
        rowKey="extraTypeId"
        loading={loading}
        bordered
      />

      <Modal
        title={editingExtra ? t('masters.nodalUnivExtra.editTitle', 'Edit Extra') : t('masters.nodalUnivExtra.addTitle', 'Add Extra')}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText={t('common.actions.save', 'Save')}
        cancelText={t('common.actions.cancel', 'Cancel')}
        okButtonProps={{ disabled: editingExtra ? !canEdit : !canCreate }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="type"
            label={t('common.labels.type', "Type")}
            rules={[{ required: true, message: t('masters.nodalUnivExtra.enterTypeRequired', "Please enter type") }]}
          >
            <Input placeholder={t('masters.nodalUnivExtra.enterTypePlaceholder', "Enter type (e.g., Nodal, University, Office Copy)")} />
          </Form.Item>
          <Form.Item
            name="order"
            label={t('masters.nodalUnivExtra.order', "Order")}
            rules={[{ required: true, message: t('masters.nodalUnivExtra.enterOrderRequired', "Please enter order") }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NodalUnivExtra;
