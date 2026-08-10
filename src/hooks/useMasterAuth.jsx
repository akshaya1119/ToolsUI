import React, { useState, useCallback } from 'react';
import MasterAuthModal from '../components/common/MasterAuthModal';

/**
 * Custom React Hook for Master Action Authorization with Groupwise Passcode Support
 */
export const useMasterAuth = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [moduleName, setModuleName] = useState('Master Data');
  const [operationType, setOperationType] = useState('MODIFY');
  const [groupId, setGroupId] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);

  /**
   * Prompt authorization modal before performing action
   *
   * @param {function} actionCallback - Callback receiving passcode string: (passcode) => Promise<any>
   * @param {object} options - { moduleName, operationType, groupId }
   */
  const requireAuth = useCallback((actionCallback, options = {}) => {
    setModuleName(options.moduleName || 'Master Data');
    setOperationType(options.operationType || 'MODIFY');
    setGroupId(Number(options.groupId) || 0);
    setErrorMessage('');
    setPendingAction(() => actionCallback);
    setModalOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setModalOpen(false);
    setLoading(false);
    setErrorMessage('');
    setPendingAction(null);
  }, []);

  const handleSubmit = useCallback(
    async (passcode) => {
      if (!pendingAction) return;

      setLoading(true);
      setErrorMessage('');

      try {
        await pendingAction(passcode);
        // Action succeeded -> close modal
        setModalOpen(false);
        setLoading(false);
        setPendingAction(null);
      } catch (err) {
        setLoading(false);
        const serverMsg =
          err.response?.data?.message ||
          err.message ||
          'Invalid authorization passcode.';
        setErrorMessage(serverMsg);
      }
    },
    [pendingAction]
  );

  const authModalComponent = (
    <MasterAuthModal
      open={modalOpen}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      moduleName={moduleName}
      operationType={operationType}
      groupId={groupId}
      loading={loading}
      errorMessage={errorMessage}
    />
  );

  return {
    requireAuth,
    authModalComponent,
    isAuthOpen: modalOpen,
  };
};

export default useMasterAuth;
