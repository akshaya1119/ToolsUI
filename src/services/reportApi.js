import API from '../hooks/api';
import axios from 'axios';

const url = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = import.meta.env.VITE_RPT_API_URL;
 // 👇 fetch groups
  export const getGroups = async () => {
    try {
      const res = await axios.get(`${url}/Groups`);
      return res.data;
    } catch (err) {
      console.err("Failed to fetch groups", err);
      throw err;
    }
  };

  // 👇 fetch paper types
  export const getPaperTypes = async () => {
    try {
      const res = await axios.get(`${url}/PaperTypes`);
      return res.data;
    } catch (err) {
      console.err("Failed to fetch paper types", err);
      throw err;
    }
  };

/**
 * Fetch templates based on typeId
 */
export const getTemplates = async (typeId, groupId = null, projectId = null) => {
  try {
    
  
    const params = { typeId };
    if (groupId) params.groupId = groupId;
    if (projectId) params.projectId = projectId;
    console.log(params)
    const response = await API.get(`/RPTTemplates/by-group`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

/**
 * Get all modules
 */
export const getModules = async () => {
  try {
    const response = await API.get('/Modules');
    return response.data;
  } catch (error) {
    console.error('Error fetching modules:', error);
    throw error;
  }
};


//  PREVIEW
export const previewReport = async ({ projectId, templateId }) => {
  const res = await axios.post(
    `${BASE_URL}/report/generate-dynamic?debug=true`,
    { projectId, templateId }
  );
  return res.data;
};

//  DOWNLOAD
export const downloadReport = async ({ projectId, templateId }) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/report/generate-dynamic`, // ✅ FIXED
      { projectId, templateId },
      { responseType: "blob" }
    );

    const blob = new Blob([res.data], {
      type: "application/pdf", // ✅ correct type
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${templateId}.pdf`; // ✅ correct extension

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download failed:", err);
  }
};

/**
 * Create design snapshot for a template
 */
export const createDesignSnapshot = async (templateId) => {
  try {
    const response = await axios.post(`${BASE_URL}/report/design-snapshot`, { templateId });
    return response.data;
  } catch (error) {
    console.error('Error creating design snapshot:', error);
    throw error;
  }
};

/**
 * Upload template with design check
 */
export const uploadWithDesignCheck = async (formData) => {
  try {
    console.log("📡 Calling upload-with-design-check API...");
    console.log("FormData contents:", {
      templateId: formData.get('templateId'),
      file: formData.get('file')?.name
    });
    
    const response = await axios.post(
      `${BASE_URL}/report/upload-with-design-check`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    console.log("📥 API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading with design check:', error);
    console.error('Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};