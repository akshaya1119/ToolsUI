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

export const extractParsedFields = (input) => {
  if (!input) return [];

  // Helper to parse JSON strings safely
  const parseSafe = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string" && val.trim().length > 0) {
      try {
        const p = JSON.parse(val);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper to clean name and detect *
  const cleanField = (f) => {
    if (typeof f === "string") {
      const isReq = f.endsWith("*");
      return { 
        name: isReq ? f.slice(0, -1).trim() : f.trim(), 
        isRequired: isReq 
      };
    }
    
    const rawName = f?.name ?? f?.Name ?? f?.fieldName ?? f?.FieldName ?? "";
    const isNameReq = typeof rawName === "string" && rawName.endsWith("*");
    const name = isNameReq ? rawName.slice(0, -1).trim() : rawName.trim();
    
    const isRequired = !!(
      isNameReq ||
      (f?.isRequired ??
       f?.IsRequired ??
       f?.required ??
       f?.Required ??
       false)
    );

    return { name, isRequired };
  };

  // 1. Determine the "Master List" (usually all fields)
  let masterRaw = [];
  if (Array.isArray(input)) {
    masterRaw = input;
  } else {
    // Priority: parsedFields (objects) > parsedFieldsJson (string) > requiredFieldsJson (string)
    masterRaw = Array.isArray(input.parsedFields ?? input.ParsedFields)
      ? (input.parsedFields ?? input.ParsedFields)
      : parseSafe(input.parsedFieldsJson ?? input.ParsedFieldsJson ?? input.requiredFieldsJson ?? input.RequiredFieldsJson);
  }

  // 2. Determine the "Required Set" for marking
  const requiredSet = new Set();
  if (input && !Array.isArray(input)) {
    const reqList = parseSafe(input.requiredFieldsJson ?? input.RequiredFieldsJson ?? input.requiredFields ?? input.RequiredFields);
    reqList.forEach(r => {
      const cleaned = cleanField(r);
      if (cleaned.name) requiredSet.add(cleaned.name.toLowerCase());
    });
  }

  // 3. Normalize and Merge
  return masterRaw.map(f => {
    const normalized = cleanField(f);
    if (!normalized.name) return null;
    
    // If it was already marked via * or object property, or found in the RequiredSet
    if (requiredSet.has(normalized.name.toLowerCase())) {
      normalized.isRequired = true;
    }
    
    return normalized;
  }).filter(Boolean);
};

export const normalizeKey = (value) =>
  (value ?? "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const parseMappingJson = (raw) => {
  if (!raw) return { mappings: {}, groupBy: [], orderBy: [], labelCopies: 1, staticVariables: {} };

  // Normalize orderBy: accepts string[] or [{column, direction}] (legacy) → always returns string[]
  const normalizeOrderBy = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => (typeof item === "string" ? item : item?.column)).filter(Boolean);
  };

  try {
    const parsed = JSON.parse(raw);
    const staticVariables = (parsed?.staticVariables && typeof parsed.staticVariables === "object" && !Array.isArray(parsed.staticVariables))
      ? parsed.staticVariables
      : {};
    if (Array.isArray(parsed)) {
      const map = {};
      parsed.forEach((item) => {
        if (item?.rptField && item?.source) {
          const clean = item.rptField.replace(/\*$/, "").trim();
          map[clean] = item.source;
        }
      });
      return { mappings: map, groupBy: [], orderBy: [], labelCopies: 1, staticVariables: {} };
    }
    if (Array.isArray(parsed?.mappings)) {
      const map = {};
      parsed.mappings.forEach((item) => {
        if (item?.rptField && item?.source) {
          const clean = item.rptField.replace(/\*$/, "").trim();
          map[clean] = item.source;
        }
      });
      return {
        mappings: map,
        groupBy: parsed?.groupBy || [],
        orderBy: normalizeOrderBy(parsed?.orderBy),
        labelCopies: Number.isFinite(Number(parsed?.labelCopies)) && Number(parsed.labelCopies) >= 1
          ? Math.round(Number(parsed.labelCopies))
          : 1,
        staticVariables,
      };
    }
    if (parsed?.mappings && typeof parsed.mappings === "object") {
      const map = {};
      Object.entries(parsed.mappings).forEach(([key, val]) => {
        map[key.replace(/\*$/, "").trim()] = val;
      });
      return { ...parsed, mappings: map };
    }
    if (parsed && typeof parsed === "object") {
      return { mappings: parsed, groupBy: [], orderBy: [], labelCopies: 1, staticVariables: {} };
    }
  } catch (err) {
    return { mappings: {}, groupBy: [], orderBy: [], labelCopies: 1, staticVariables: {} };
  }
  return { mappings: {}, groupBy: [], orderBy: [], labelCopies: 1, staticVariables: {} };
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

export const buildReportFileName = ({
  templateName,
  projectName,
  typeId,
  ext = "pdf",
}) => {
  const sanitize = (value, fallback) => {
    const raw = (value ?? fallback ?? "").toString().trim();
    const cleaned = raw
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    return cleaned || fallback || "report";
  };
  const name = sanitize(templateName, "Template");
  const project = sanitize(projectName, "Project");
  const type = sanitize(typeId ?? "TypeId", "TypeId");
  const extension = ext.startsWith(".") ? ext.slice(1) : ext;
  return `${name}_${project}_${type}.${extension}`;
};
