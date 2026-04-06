export const normalizeId = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

export const getErrorMessage = (err, fallback) => {
  if (!err) return fallback;
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.Message === "string" && data.Message.trim()) return data.Message;
  if (Array.isArray(data) && data.length) return data.join(", ");
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  if (typeof err?.message === "string" && err.message.trim()) return err.message;
  return fallback;
};

export const getErrorMessageAsync = async (err, fallback) => {
  const data = err?.response?.data;
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      const text = await data.text();
      if (!text) return fallback;
      try {
        const parsed = JSON.parse(text);
        return getErrorMessage({ response: { data: parsed } }, fallback);
      } catch {
        return text;
      }
    } catch {
      return fallback;
    }
  }
  return getErrorMessage(err, fallback);
};

export const extractParsedFields = (template) => {
  if (!template) return [];
  const raw =
    template.parsedFieldsJson ??
    template.ParsedFieldsJson ??
    template.parsedFields ??
    template.ParsedFields ??
    null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const normalizeKey = (value) =>
  (value ?? "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const parseMappingJson = (raw) => {
  if (!raw) return { mappings: {}, groupBy: [] };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const map = {};
      parsed.forEach((item) => {
        if (item?.rptField && item?.source) map[item.rptField] = item.source;
      });
      return { mappings: map, groupBy: [] };
    }
    if (Array.isArray(parsed?.mappings)) {
      const map = {};
      parsed.mappings.forEach((item) => {
        if (item?.rptField && item?.source) map[item.rptField] = item.source;
      });
      return { mappings: map, groupBy: parsed?.groupBy || [] };
    }
    if (parsed?.mappings && typeof parsed.mappings === "object") {
      return { mappings: parsed.mappings, groupBy: parsed?.groupBy || [] };
    }
    if (parsed && typeof parsed === "object") {
      return { mappings: parsed, groupBy: [] };
    }
  } catch (err) {
    return { mappings: {}, groupBy: [] };
  }
  return { mappings: {}, groupBy: [] };
};

export const normalizeModuleIds = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((id) => Number.isFinite(Number(id)));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((id) => Number.isFinite(Number(id)));
      }
    } catch {
      // fall through to comma parsing
    }
    return raw
      .split(",")
      .map((val) => Number(val.trim()))
      .filter((id) => Number.isFinite(id));
  }
  return [];
};

export const resolveModuleLabels = (moduleMap, record) => {
  const ids = normalizeModuleIds(record?.moduleIds ?? record?.ModuleIds);
  if (!ids.length) return "-";
  const labels = ids.map((id) => moduleMap.get(id) || `#${id}`);
  const visible = labels.slice(0, 2);
  if (labels.length <= 2) return visible.join(", ");
  return `${visible.join(", ")} +${labels.length - 2} more`;
};

export const resolveModuleTooltip = (moduleMap, record) => {
  const ids = normalizeModuleIds(record?.moduleIds ?? record?.ModuleIds);
  if (!ids.length) return "-";
  return ids.map((id) => moduleMap.get(id) || `#${id}`).join(", ");
};

export const getModuleDisplay = (moduleMap, record) => {
  const ids = normalizeModuleIds(record?.moduleIds ?? record?.ModuleIds);
  if (!ids.length) return { line1: "-", line2: "", more: 0, hasMore: false };
  const labels = ids.map((id) => moduleMap.get(id) || `#${id}`);
  const line1 = labels[0] || "-";
  const line2Labels = labels[1] ? [labels[1]] : [];
  const more = labels.length - 2;
  return {
    line1,
    line2: line2Labels.join(", "),
    more: more > 0 ? more : 0,
    hasMore: labels.length > 2,
  };
};

export const resolveUploaderLabel = (userMap, record) => {
  const uploaderId =
    record?.uploadedByUserId ??
    record?.UploadedByUserId ??
    record?.createdByUserId ??
    record?.CreatedByUserId ??
    null;
  if (!uploaderId) return "-";
  const user = userMap.get(uploaderId);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.userName || `User ${uploaderId}`;
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

export const resolveTemplateId = (record) =>
  record?.templateId ?? record?.TemplateId ?? record?.id ?? record?.Id ?? null;

export const getScopeLabel = (record) =>
  record?.projectId ? "Project" : record?.groupId ? "Group" : "Standard";
