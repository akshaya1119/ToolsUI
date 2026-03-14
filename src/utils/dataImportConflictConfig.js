export const CONFLICT_STATUS = {
  PENDING: "pending",
  RESOLVED: "resolved",
  IGNORED: "ignored",
};

export const CONFLICT_TYPE_CONFIG = {
  catch_unique_field: {
    title: "Catch No Conflict",
    groupLabel: "Catch Conflicts",
    color: "#1677ff",
    background: "#f0f7ff",
    accent: "#91caff",
    resolveKind: "select",
  },
  center_multiple_nodals: {
    title: "Centre to Multiple Nodals",
    groupLabel: "College/Centre/Nodal Mapping Conflicts",
    color: "#fa8c16",
    background: "#fff7e6",
    accent: "#ffd591",
    resolveKind: "select",
  },
  college_multiple_nodals: {
    title: "College to Multiple Nodals",
    groupLabel: "College/Centre/Nodal Mapping Conflicts",
    color: "#eb2f96",
    background: "#fff0f6",
    accent: "#ffadd2",
    resolveKind: "select",
  },
  college_multiple_centers: {
    title: "College to Multiple Centres",
    groupLabel: "College/Centre/Nodal Mapping Conflicts",
    color: "#2f54eb",
    background: "#f0f5ff",
    accent: "#adc6ff",
    resolveKind: "select",
  },
  required_field_empty: {
    title: "Required Field Missing",
    groupLabel: "Required Field Conflicts",
    color: "#ff4d4f",
    background: "#fff1f0",
    accent: "#ffa39e",
    resolveKind: "input",
  },
  zero_nr_quantity: {
    title: "Zero NR Quantity",
    groupLabel: "Required Field Conflicts",
    color: "#13c2c2",
    background: "#e6fffb",
    accent: "#87e8de",
    resolveKind: "input",
  },
  nodal_code_digit_mismatch: {
    title: "Nodal Digit Mismatch",
    groupLabel: "College/Centre/Nodal Mapping Conflicts",
    color: "#d4380d",
    background: "#fff2e8",
    accent: "#ffbb96",
    resolveKind: "input",
  },
  default: {
    title: "Conflict",
    groupLabel: "Other Conflicts",
    color: "#595959",
    background: "#fafafa",
    accent: "#d9d9d9",
    resolveKind: "manual",
  },
};

export const STATUS_TAG_CONFIG = {
  [CONFLICT_STATUS.PENDING]: {
    color: "gold",
    label: "Pending",
  },
  [CONFLICT_STATUS.RESOLVED]: {
    color: "success",
    label: "Resolved",
  },
  [CONFLICT_STATUS.IGNORED]: {
    color: "default",
    label: "Ignored",
  },
};

export const getConflictTypeConfig = (conflictType) =>
  CONFLICT_TYPE_CONFIG[conflictType] || CONFLICT_TYPE_CONFIG.default;
