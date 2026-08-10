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

export const fetchMappingOptions = async (apiUrl, { groupId, typeId, projectId, templateId }) => {
  const params = { groupId, typeId };
  if (projectId) params.projectId = projectId;
  if (templateId) params.templateId = templateId;
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
    subName,
    file,
    projectId,
    moduleIds,
    forceUpload,
    passcode,
  },
) => {
  const formData = new FormData();
  formData.append("typeId", typeId);
  formData.append("templateName", templateName);
  if (subName) {
    formData.append("subName", subName);
  }
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

  const headers = { "Content-Type": "multipart/form-data" };
  if (passcode) {
    headers["X-Master-Auth-Passcode"] = passcode;
  }

  const res = await axios.post(`${apiUrl}/RPTTemplates/upload`, formData, {
    headers,
  });

  return res.data;
};

export const importTemplatesFromGroup = async (apiUrl, payload) => {
  const headers = {};
  // if (payload.passcode) headers["X-Master-Auth-Passcode"] = payload.passcode;
  await axios.post(`${apiUrl}/RPTTemplates/import-from-group`, payload, { headers });
};

export const promoteTemplatesToMaster = async (apiUrl, payload) => {
  const headers = {};
  if (payload.passcode) headers["X-Master-Auth-Passcode"] = payload.passcode;
  const res = await axios.post(`${apiUrl}/RPTTemplates/promote-to-group-master`, payload, { headers });
  return res.data;
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

// ====================
// MRPTTemplates (Master Templates)
// ====================

export const fetchMasterTemplatesByGroup = async (apiUrl, { typeId, groupId }) => {
  const params = { typeId };
  if (groupId) params.groupId = groupId;
  const res = await axios.get(`${apiUrl}/MRPTTemplates/by-group`, { params });
  return res.data;
};

export const uploadMasterTemplate = async (apiUrl, payload) => {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("typeId", payload.typeId);
  if (payload.groupId) formData.append("groupId", payload.groupId);
  formData.append("templateName", payload.templateName);
  if (payload.subName) formData.append("subName", payload.subName);

  const headers = { "Content-Type": "multipart/form-data" };
  if (payload.passcode) {
    headers["X-Master-Auth-Passcode"] = payload.passcode;
  }

  const res = await axios.post(`${apiUrl}/MRPTTemplates/upload`, formData, {
    headers,
  });
  return res.data;
};

export const softDeleteMasterTemplate = async (apiUrl, templateId) => {
  await axios.delete(`${apiUrl}/MRPTTemplates/${templateId}/soft-delete`);
};

export const restoreMasterTemplate = async (apiUrl, templateId) => {
  await axios.post(`${apiUrl}/MRPTTemplates/${templateId}/restore`);
};

export const downloadMasterTemplateBlob = async (apiUrl, template) => {
  const res = await axios.get(`${apiUrl}/MRPTTemplates/${template.templateId}/download`, {
    responseType: "blob",
  });
  const contentDisposition = res.headers["content-disposition"];
  let fileName = "template.rpt";
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (fileNameMatch && fileNameMatch.length === 2) {
      fileName = fileNameMatch[1];
    }
  }
  return { blob: res.data, fileName };
};

export const fetchMasterTemplateVersions = async (apiUrl, templateId) => {
  const res = await axios.get(`${apiUrl}/MRPTTemplates/${templateId}/versions`);
  return res.data;
};

export const activateMasterTemplateVersion = async (apiUrl, templateId) => {
  await axios.post(`${apiUrl}/MRPTTemplates/${templateId}/activate`);
};

export const fetchMasterTemplateMapping = async (apiUrl, templateId) => {
  const res = await axios.get(`${apiUrl}/MRPTTemplates/${templateId}/mapping`);
  return res.data;
};

export const saveMasterTemplateMapping = async (apiUrl, templateId, mappingJson) => {
  await axios.post(`${apiUrl}/MRPTTemplates/${templateId}/mapping`, { mappingJson });
};

export const fetchImportableTemplates = async (apiUrl, { sourceScope, sourceGroupId, sourceProjectId, sourceTypeId }) => {
  const params = { sourceScope };
  if (sourceGroupId) params.sourceGroupId = sourceGroupId;
  if (sourceProjectId) params.sourceProjectId = sourceProjectId;
  if (sourceTypeId) params.sourceTypeId = sourceTypeId;
  
  const res = await axios.get(`${apiUrl}/RPTTemplates/importable-templates`, { params });
  return res.data;
};
