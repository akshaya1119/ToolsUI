import React from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { normalizeStatus } from './statusUtils';

const StatusBadgeHV = ({ status }) => {
  const configs = {
    1: {
      icon: CheckCircle2,
      label: 'Verified',
      bgClass: 'bg-green-50',
      textClass: 'text-green-700',
      iconClass: 'text-green-500',
      dotClass: 'bg-green-500',
    },
    2: {
      icon: AlertCircle,
      label: 'Needs Review',
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-700',
      iconClass: 'text-orange-500',
      dotClass: 'bg-orange-500',
    },
    0: {
      icon: XCircle,
      label: 'Not Verified',
      bgClass: 'bg-gray-50',
      textClass: 'text-gray-600',
      iconClass: 'text-gray-400',
      dotClass: 'bg-gray-400',
    },
  };

  const mappedKey = normalizeStatus(status);
  const config = configs[mappedKey];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
};

export default StatusBadgeHV;
