import API from '../hooks/api';
import axios from 'axios';

const url = import.meta.env.VITE_API_BASE_URL;

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

/**
 * Download report file
 */
export const downloadReport = async ({ templateId }) => {
  try {
    const response = await API.get(`/RPTTemplates/${templateId}/download`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'report.rpt';
    link.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw error;
  }
};

/**
 * Download template file (.rpt)
 */
export const downloadTemplate = async (templateId) => {
  try {
    const response = await API.get(`/RPTTemplates/${templateId}/download`, {
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = 'template.rpt';
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading template:', error);
    throw error;
  }
};
