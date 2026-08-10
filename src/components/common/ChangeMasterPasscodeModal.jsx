import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Alert, Typography, Space, Button, message } from 'antd';
import { LockOutlined, KeyOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { KeyRound } from 'lucide-react';
import API from '../../hooks/api';

const { Text, Title } = Typography;

/**
 * ChangeMasterPasscodeModal - Ant Design modal for changing/setting custom Master Authorization Passcode
 */
const ChangeMasterPasscodeModal = ({ open, onCancel, groupId = 0 }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isPasscodeSet, setIsPasscodeSet] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (open) {
      form.resetFields();
      setErrorMessage('');
      setSuccessMessage('');
      checkPasscodeStatus();
    }
  }, [open, form, groupId]);

  const checkPasscodeStatus = async () => {
    try {
      const res = await API.get(`/MasterAuth/status?groupId=${groupId}`);
      if (res.data && typeof res.data.isPasscodeSet === 'boolean') {
        setIsPasscodeSet(res.data.isPasscodeSet);
        if (!res.data.isPasscodeSet) {
          // If no passcode is set yet, automatically clear any active lockout!
          await API.post(`/MasterAuth/reset-lockout?groupId=${groupId}`);
        }
      }
    } catch (err) {
      console.warn("Could not check MasterAuth status", err);
    }
  };

  const handleFinish = async (values) => {
    const { currentPasscode, newPasscode, confirmPasscode } = values;

    if (newPasscode !== confirmPasscode) {
      setErrorMessage('New passcode and confirmation passcode do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await API.post('/MasterAuth/change-passcode', {
        groupId,
        currentPasscode: isPasscodeSet ? currentPasscode : '',
        newPasscode
      });

      if (res.data?.success) {
        const msg = isPasscodeSet ? 'Master passcode updated successfully!' : 'Master passcode created successfully!';
        setSuccessMessage(res.data.message || msg);
        message.success(msg);
        setTimeout(() => {
          if (onCancel) onCancel();
        }, 1500);
      } else {
        setErrorMessage(res.data?.message || 'Failed to set master passcode.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to set master passcode.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={450}
      centered
      maskClosable={false}
      styles={{
        header: { borderBottom: '1px solid #f0f0f0', paddingBottom: 12 },
        body: { paddingTop: 20, paddingBottom: 10 }
      }}
      title={
        <Space size={8} align="center">
          <KeyRound style={{ color: '#1890ff', fontSize: 20 }} />
          <Text strong style={{ fontSize: 16 }}>
            {isPasscodeSet ? 'Set / Change Master Passcode' : 'Initial Setup: Create Master Passcode'}
          </Text>
        </Space>
      }
    >
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>
          {isPasscodeSet ? 'Update Master Passcode' : 'Set Master Passcode'}
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {isPasscodeSet
            ? 'Set a new custom PIN/Passcode for Master Authorization actions.'
            : 'No Master Passcode is set yet. Create your PIN to secure master actions.'}
        </Text>
      </div>

      {errorMessage && (
        <Alert
          message={errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {successMessage && (
        <Alert
          message={successMessage}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
      >
        {isPasscodeSet && (
          <Form.Item
            name="currentPasscode"
            label={<Text strong style={{ fontSize: 13 }}>Current Master Passcode</Text>}
            rules={[
              { required: true, message: 'Please enter current passcode.' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Enter current passcode"
              size="large"
            />
          </Form.Item>
        )}

        <Form.Item
          name="newPasscode"
          label={<Text strong style={{ fontSize: 13 }}>{isPasscodeSet ? 'New Master Passcode / PIN' : 'Master Passcode / PIN'}</Text>}
          rules={[
            { required: true, message: 'Please enter new passcode.' },
            { min: 4, message: 'Passcode must be at least 4 characters long.' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#1890ff' }} />}
            placeholder="Enter passcode (min 4 characters)"
            size="large"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="confirmPasscode"
          label={<Text strong style={{ fontSize: 13 }}>Confirm Passcode</Text>}
          dependencies={['newPasscode']}
          rules={[
            { required: true, message: 'Please confirm passcode.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPasscode') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passcodes do not match.'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#52c41a' }} />}
            placeholder="Confirm passcode"
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SafetyCertificateOutlined />}
            >
              {isPasscodeSet ? 'Update Passcode' : 'Set Master Passcode'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangeMasterPasscodeModal;
