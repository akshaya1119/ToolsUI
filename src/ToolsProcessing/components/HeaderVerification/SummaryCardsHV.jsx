import React from 'react';
import { ClipboardList, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { normalizeStatus } from './statusUtils';

const SummaryCardsHV = ({ records = [], summaryStats, onSelectCard, selectedCardKey }) => {
  const getNumericStatus = normalizeStatus;

  // Use API-provided stats when available, fall back to computing from records
  const totalCatch = summaryStats?.total ?? records.length;
  const verified = summaryStats?.verified ?? records.filter(r => getNumericStatus(r.status) === 1).length;
  const unclear = summaryStats?.unclear ?? records.filter(r => getNumericStatus(r.status) === 2).length;
  const notVerified = summaryStats?.notVerified ?? records.filter(r => getNumericStatus(r.status) === 0).length;

  const cards = [
    {
      key: 'ALL',
      label: 'TOTAL CATCH',
      value: totalCatch,
      icon: ClipboardList,
      bgClass: 'bg-white',
      iconBgClass: 'bg-blue-100',
      iconColorClass: 'text-blue-600',
      textClass: 'text-blue-700',
      labelClass: 'text-gray-500',
    },
    {
      key: 'VERIFIED',
      label: 'VERIFIED',
      value: verified,
      icon: CheckCircle2,
      bgClass: 'bg-white',
      iconBgClass: 'text-green-500',
      iconColorClass: 'text-green-500',
      textClass: 'text-green-600',
      labelClass: 'text-gray-500',
    },
    {
      key: 'UNCLEAR',
      label: 'NEEDS REVIEW',
      value: unclear,
      icon: AlertCircle,
      bgClass: 'bg-white',
      iconBgClass: 'text-orange-500',
      iconColorClass: 'text-orange-500',
      textClass: 'text-orange-600',
      labelClass: 'text-gray-500',
    },
    {
      key: 'NOT_VERIFIED',
      label: 'NOT VERIFIED',
      value: notVerified,
      icon: XCircle,
      bgClass: 'bg-white',
      iconBgClass: 'text-gray-400',
      iconColorClass: 'text-gray-500',
      textClass: 'text-gray-700',
      labelClass: 'text-gray-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
      {cards.map(card => {
        const Icon = card.icon;
        const active = selectedCardKey === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelectCard && onSelectCard(card.key)}
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 shadow-sm transition-all duration-200 text-left w-full ${card.bgClass} ${active ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:shadow-md hover:border-slate-300'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${card.iconBgClass}`}>
                <Icon className={`w-5 h-5 ${card.iconColorClass}`} />
              </div>
              <div className="flex flex-col">
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${card.labelClass}`}>
                  {card.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${card.textClass}`}>
                {card.value}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SummaryCardsHV;
