import React, { useMemo, useState } from 'react';
import { Popover, Tag } from 'antd';
import { ChevronRight } from 'lucide-react';

/**
 * Extracts a meaningful grouping prefix from a catch number while preserving order.
 * - Delimited: "CS-101" -> "CS", "LOT_01" -> "LOT"
 * - Alphabetic: "PHY101" -> "PHY"
 * - Numeric (>= 6 digits): "140701" -> "1407"
 * - Numeric (5 digits): "14071" -> "140"
 * - Numeric (4 digits): "1401" -> "14"
 * - Numeric (<= 3 digits): "101" -> "1"
 */
export const getCatchGroupKey = (catchNo) => {
  if (catchNo === null || catchNo === undefined) return 'Other';
  const str = String(catchNo).trim();
  if (!str) return 'Other';

  const delimMatch = str.match(/^([A-Za-z0-9]+)[-_/\s]/);
  if (delimMatch && delimMatch[1]) {
    return delimMatch[1].toUpperCase();
  }

  const alphaMatch = str.match(/^([A-Za-z]+)/);
  if (alphaMatch && alphaMatch[1]) {
    return alphaMatch[1].toUpperCase();
  }

  if (/^\d+$/.test(str)) {
    if (str.length >= 6) return str.slice(0, 4);
    if (str.length === 5) return str.slice(0, 3);
    if (str.length === 4) return str.slice(0, 2);
    return str.slice(0, 1);
  }

  return str.slice(0, Math.min(3, str.length));
};

export const getCatchGroupLabel = (prefix) => {
  if (/^\d+$/.test(prefix)) {
    return `Series ${prefix}`;
  }
  return prefix;
};

/**
 * Groups catch numbers by prefix while strictly maintaining original ordering.
 */
export const groupCatchNumbers = (catches) => {
  if (!Array.isArray(catches) || catches.length === 0) return [];
  const groupsMap = new Map();

  catches.forEach((c) => {
    const key = getCatchGroupKey(c);
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        label: getCatchGroupLabel(key),
        catches: [],
      });
    }
    groupsMap.get(key).catches.push(c);
  });

  return Array.from(groupsMap.values());
};

const BatchCatchAccordion = ({ batchNo, catches = [] }) => {
  // Group catch numbers preserving original list ordering
  const groups = useMemo(() => groupCatchNumbers(catches), [catches]);

  // Multiple groups can expand. Expand all if total <= 25, or first group if more.
  const [expandedKeys, setExpandedKeys] = useState(() => {
    if (!groups.length) return new Set();
    if (catches.length <= 25) {
      return new Set(groups.map((g) => g.key));
    }
    return new Set([groups[0].key]);
  });

  const toggleGroup = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const popoverContent = (
    <div style={{ width: 240, maxHeight: 420, display: 'flex', flexDirection: 'column' }}>
      {/* Batch Header with Count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 8,
          marginBottom: 8,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
            Batch {String(batchNo)}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 10,
              background: '#e0f2fe',
              color: '#0369a1',
              fontWeight: 600,
            }}
          >
            {catches.length}
          </span>
        </div>
      </div>

      {/* Accordion expand/collapse shortcuts if multiple groups */}
      {groups.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
            padding: '0 2px',
            fontSize: 11,
            color: '#64748b',
          }}
        >
          <span>{groups.length} groups</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setExpandedKeys(new Set(groups.map((g) => g.key)))}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 11,
                color: '#2563eb',
                cursor: 'pointer',
              }}
            >
              Expand All
            </button>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <button
              type="button"
              onClick={() => setExpandedKeys(new Set())}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 11,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Collapse
            </button>
          </div>
        </div>
      )}

      {/* Accordion groups container */}
      <div
        className="rtm-compact-scrollbar"
        style={{
          overflowY: 'auto',
          flex: 1,
          paddingRight: 4,
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 transparent',
        }}
      >
        {groups.length === 0 ? (
          <div style={{ padding: '12px 4px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
            No catches assigned
          </div>
        ) : (
          groups.map((group) => {
            const isExpanded = expandedKeys.has(group.key);

            return (
              <div
                key={group.key}
                style={{
                  marginBottom: 6,
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: '#ffffff',
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 8px',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <ChevronRight
                    size={13}
                    style={{
                      color: '#64748b',
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s ease',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {group.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 5px',
                      borderRadius: 10,
                      background: '#e2e8f0',
                      color: '#475569',
                    }}
                  >
                    {group.catches.length}
                  </span>
                </div>

                {/* Accordion Body with Vertical Catch List & Fixed Scrollbar */}
                {isExpanded && (
                  <div
                    className="rtm-compact-scrollbar"
                    style={{
                      maxHeight: 240,
                      overflowY: 'auto',
                      padding: '4px 6px',
                      background: '#ffffff',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 transparent',
                    }}
                  >
                    {group.catches.map((c, i) => (
                      <div
                        key={`${c}-${i}`}
                        style={{
                          fontSize: 12,
                          padding: '2px 8px',
                          background: '#f0f0f0',
                          borderRadius: 3,
                          marginBottom: 2,
                          color: '#1e293b',
                        }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .rtm-compact-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .rtm-compact-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .rtm-compact-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }
        .rtm-compact-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger={['hover', 'click']}
      mouseLeaveDelay={0.25}
      placement="bottomLeft"
      overlayInnerStyle={{ padding: 10, borderRadius: 8 }}
    >
      <Tag
        color="blue"
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        Batch {String(batchNo)}
        {catches.length > 0 && (
          <span style={{ marginLeft: 4, fontSize: 11 }}>({catches.length})</span>
        )}
      </Tag>
    </Popover>
  );
};

export default BatchCatchAccordion;
