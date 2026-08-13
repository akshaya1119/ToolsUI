import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Alert, Typography, Space, Button } from 'antd';
import { LockOutlined, SafetyCertificateOutlined, EditOutlined } from '@ant-design/icons';
import { KeyRound } from 'lucide-react';
import ChangeMasterPasscodeModal from './ChangeMasterPasscodeModal';
import API from '../../hooks/api';

const { Text, Title } = Typography;

/**
 * MasterAuthModal - Reusable Ant Design modal for Master Passcode Verification
 */
const MasterAuthModal = ({
  open,
  onCancel,
  onSubmit,
  moduleName = 'Master Data',
  operationType = 'MODIFY',
  groupId = 0,
  loading = false,
  errorMessage = '',
}) => {
  const [form] = Form.useForm();
  const [localError, setLocalError] = useState('');
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [isPasscodeSet, setIsPasscodeSet] = useState(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setLocalError('');
      setIsPasscodeSet(null);
      checkPasscodeStatus();
    }
  }, [open, form, groupId]);

  const checkPasscodeStatus = async () => {
    try {
      const res = await API.get(`/MasterAuth/status?groupId=${groupId}`);
      if (res.data && typeof res.data.isPasscodeSet === 'boolean') {
        setIsPasscodeSet(res.data.isPasscodeSet);
        if (res.data.isPasscodeSet === false) {
          // First-time setup: automatically prompt the Create Master Passcode modal!
          setChangeModalOpen(true);
        }
      } else {
        setIsPasscodeSet(true);
      }
    } catch (err) {
      console.warn("Could not check MasterAuth status", err);
      setIsPasscodeSet(true);
    }
  };

  useEffect(() => {
    if (errorMessage) {
      setLocalError(errorMessage);
    }
  }, [errorMessage]);

  const handleFinish = (values) => {
    setLocalError('');
    if (onSubmit) {
      onSubmit(values.passcode);
    }
  };

  const handleResetLockout = async () => {
    try {
      await API.post('/MasterAuth/reset-lockout');
      setLocalError('');
      setChangeModalOpen(true);
    } catch (err) {
      console.warn("Failed to reset lockout", err);
    }
  };

  const isLockoutError = localError.toLowerCase().includes('locked out');

  return (
    <>
      <Modal
        open={open && isPasscodeSet === true && !changeModalOpen}
        onCancel={onCancel}
        footer={null}
        destroyOnClose
        width={440}
        centered
        maskClosable={false}
        styles={{
          header: { borderBottom: '1px solid #f0f0f0', paddingBottom: 12 },
          body: { paddingTop: 20, paddingBottom: 10 }
        }}
        title={
          <Space size={8} align="center">
            <SafetyCertificateOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <Text strong style={{ fontSize: 16 }}>Master Authorization Required</Text>
          </Space>
        }
      >
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#e6f7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <KeyRound style={{ fontSize: 28, color: '#1890ff' }} />
          </div>
          <Title level={5} style={{ margin: 0 }}>Authorize Action</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {/* Authorization passcode is required to continue. */}
            Authorization passcode is required to <Text strong style={{ color: '#cf1322' }}>{operationType}</Text> on <Text strong>{moduleName}</Text>.
          </Text>
        </div>

        {localError && (
          <Alert
            message={localError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              isLockoutError ? (
                <Button size="small" type="primary" danger onClick={handleResetLockout}>
                  Reset & Set PIN
                </Button>
              ) : null
            }
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
        >
          <Form.Item
            name="passcode"
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 13 }}>Master Passcode / PIN</Text>
              </div>
            }
            rules={[
              { required: true, message: 'Please enter the authorization passcode.' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Enter passcode"
              size="large"
              autoFocus
              maxLength={32}
            />
          </Form.Item>

          <Form.Item
            style={{
              marginBottom: 0,
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {/* Left corner */}
              <Button
                type="link"
                size="small"
                onClick={() => setChangeModalOpen(true)}
                style={{
                  padding: 0,
                  fontSize: 12,
                }}
              >
                Change PIN?
              </Button>

              {/* Right corner */}
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
                  Authorize & Proceed
                </Button>
              </Space>
            </div>
          </Form.Item>
         

        </Form>
      </Modal>
      <ChangeMasterPasscodeModal
        open={changeModalOpen}
        groupId={groupId}
        onCancel={() => setChangeModalOpen(false)}
        onSuccess={(newPasscode, isInitialSetup) => {
          setChangeModalOpen(false);
          if (onSubmit) {
            onSubmit(newPasscode);
          }
        }}
      />
    </>
  );
};

export default MasterAuthModal;
