import axios from "axios";

export const fetchGroupOptions = async (baseUrl) => {
  const res = await axios.get(`${baseUrl}/Groups`);
  return (res.data || []).map((group) => ({
    label: group.name || group.groupName,
    value: group.id || group.groupId,
  }));
};

export const fetchTypeOptions = async (baseUrl) => {
  const res = await axios.get(`${baseUrl}/PaperTypes`);
  return (res.data || []).map((type) => ({
    label: type.types,
    value: type.typeId,
  }));
};

export const fetchProjectOptions = async ({
  baseUrl,
  apiUrl,
  normalizeId,
}) => {
  const normalize = typeof normalizeId === "function" ? normalizeId : (v) => v;
  try {
    const res = await axios.get(`${baseUrl}/Project`);
    const list = Array.isArray(res.data) ? res.data : [];
    return list
      .map((project) => ({
        label: project?.name ? project.name : `Project ${project?.projectId}`,
        value: project?.projectId,
        groupId: normalize(project?.groupId || project?.groupID || null),
        typeId: normalize(project?.typeId || project?.typeID || null),
      }))
      .filter((project) => project.value);
  } catch (err) {
    if (!apiUrl) throw err;
    const res = await axios.get(`${apiUrl}/Projects?page=1&pageSize=1000`);
    const data = Array.isArray(res.data?.data) ? res.data.data : res.data;
    const formatted = (data || []).map((project) => {
      const id = project.projectId ?? project.id;
      const name = project.name ?? project.projectName;
      return {
        label: name ? `${name} (ID ${id})` : `Project ${id}`,
        value: id,
        groupId: normalize(project?.groupId ?? project?.group),
        typeId: normalize(project?.typeId ?? project?.type),
      };
    });
    return formatted.filter((project) => project.value);
  }
};

export const fetchModuleOptions = async (apiUrl) => {
  const res = await axios.get(`${apiUrl}/Modules`);
  return (res.data || []).map((module) => ({
    label: module.name,
    value: module.id,
  }));
};

export const fetchUsers = async ({ baseUrl, token }) => {
  const res = await axios.get(`${baseUrl}/User`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const fetchTemplatesByGroup = async (
  apiUrl,
  { typeId, groupId, projectId },
) => {
  if (!typeId) return [];
  const params = new URLSearchParams();
  params.set("typeId", typeId);
  if (groupId) params.set("groupId", groupId);
  if (projectId) params.set("projectId", projectId);
  const res = await axios.get(
    `${apiUrl}/RPTTemplates/by-group?${params.toString()}`,
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const fetchMappingOptions = async (apiUrl, { groupId, typeId, projectId }) => {
  const params = { groupId, typeId };
  if (projectId) params.projectId = projectId;
  const res = await axios.get(`${apiUrl}/RPTTemplates/mapping-options`, { params });
  // API returns a flat deduplicated array of { value, label }
  const data = res.data;
  if (Array.isArray(data)) return data;
  // handle $values wrapper (reference handling)
  if (data && Array.isArray(data.$values)) return data.$values;
  return [];
};

export const uploadTemplate = async (
  apiUrl,
  {
    groupId,
    typeId,
    templateName,
    file,
    projectId,
    moduleIds,
    forceUpload,
  },
) => {
  const formData = new FormData();
  formData.append("typeId", typeId);
  formData.append("templateName", templateName);
  formData.append("file", file);
  if (groupId !== null && groupId !== undefined) {
    formData.append("groupId", groupId);
  }
  if (projectId !== null && projectId !== undefined) {
    formData.append("projectId", projectId);
  }
  if (Array.isArray(moduleIds)) {
    moduleIds.forEach((id) => formData.append("moduleIds", id));
  }
  if (forceUpload) {
    formData.append("forceUpload", "true");
  }

  const res = await axios.post(`${apiUrl}/RPTTemplates/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

export const importTemplatesFromGroup = async (apiUrl, payload) => {
  await axios.post(`${apiUrl}/RPTTemplates/import-from-group`, payload);
};

export const fetchTemplateDetails = async (apiUrl, templateId) => {
  const res = await axios.get(`${apiUrl}/RPTTemplates/${templateId}`);
  return res.data;
};

export const parseTemplateFields = async (apiUrl, templateId) => {
  const res = await axios.post(
    `${apiUrl}/RPTTemplates/${templateId}/parse-fields`,
  );
  return res.data;
};

export const fetchTemplateMapping = async (apiUrl, templateId) => {
  const res = await axios.get(`${apiUrl}/RPTTemplates/${templateId}/mapping`);
  return res.data;
};

export const saveTemplateMapping = async (apiUrl, templateId, mappingJson) => {
  await axios.post(`${apiUrl}/RPTTemplates/${templateId}/mapping`, {
    mappingJson,
  });
};

export const downloadTemplateBlob = async (apiUrl, template) => {
  const res = await axios.get(
    `${apiUrl}/RPTTemplates/${template.templateId}/download`,
    { responseType: "blob" },
  );
  const contentDisposition = res.headers["content-disposition"] || "";
  const fileNameMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
  const fileName =
    fileNameMatch?.[1] || `${template.templateName || "template"}.rpt`;
  return { blob: res.data, fileName };
};

export const fetchTemplateVersions = async (apiUrl, params) => {
  const res = await axios.get(`${apiUrl}/RPTTemplates/versions`, { params });
  return res.data || [];
};

export const activateTemplateVersion = async (apiUrl, templateId) => {
  await axios.post(`${apiUrl}/RPTTemplates/${templateId}/activate`);
};

export const updateTemplate = async (apiUrl, templateId, payload) => {
  await axios.put(`${apiUrl}/RPTTemplates/${templateId}`, payload);
};

export const softDeleteTemplate = async (apiUrl, templateId, scope) => {
  await axios.delete(`${apiUrl}/RPTTemplates/${templateId}/soft-delete`, {
    params: { scope },
  });
};

export const restoreTemplate = async (apiUrl, templateId) => {
  await axios.post(`${apiUrl}/RPTTemplates/${templateId}/activate`);
};
