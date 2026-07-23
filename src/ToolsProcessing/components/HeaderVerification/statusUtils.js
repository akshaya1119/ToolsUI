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
  0: 'Not Verified',
  1: 'Verified',
  2: 'Needs Review',
};

export const statusDropdownOptions = [
  { value: 0, label: 'Not Verified' },
  { value: 1, label: 'Verified' },
  { value: 2, label: 'Needs Review' },
];
