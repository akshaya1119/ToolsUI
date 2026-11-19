import i18n from '../../../i18n';

export const statusKeyMap = {
  '1': 1,
  verified: 1,
  '0': 0,
  'notverified': 0,
  'not verified': 0,
  '2': 2,
  unclear: 2,
  'needs review': 2,
  'needsreview': 2,
  notclear: 2,
};

export const normalizeStatus = (status) => {
  const normalized = String(status ?? '').trim().toLowerCase();
  return statusKeyMap[normalized] ?? 0;
};

export const statusLabels = {
  0: i18n.t('headerVerification.notVerified', 'Not Verified'),
  1: i18n.t('headerVerification.verified', 'Verified'),
  2: i18n.t('headerVerification.needsReview', 'Needs Review'),
};

export const getStatusLabel = (statusVal) => {
  const key = normalizeStatus(statusVal);
  if (key === 1) return i18n.t('headerVerification.verified', 'Verified');
  if (key === 2) return i18n.t('headerVerification.needsReview', 'Needs Review');
  return i18n.t('headerVerification.notVerified', 'Not Verified');
};

export const getStatusDropdownOptions = () => [
  { value: 0, label: i18n.t('headerVerification.notVerified', 'Not Verified') },
  { value: 1, label: i18n.t('headerVerification.verified', 'Verified') },
  { value: 2, label: i18n.t('headerVerification.needsReview', 'Needs Review') },
];

export const statusDropdownOptions = [
  { value: 0, label: 'Not Verified' },
  { value: 1, label: 'Verified' },
  { value: 2, label: 'Needs Review' },
];

