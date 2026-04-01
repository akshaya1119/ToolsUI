import API from '../../hooks/api';

/**
 * Fetch all groups
 * @returns {Promise<Array>} Array of groups with groupId and groupName
 */
export const getGroups = async () => {
  try {
    const response = await API.get('/api/groups');
    return response.data;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

/**
 * Fetch templates based on report type
 * @param {string} type - Report type (challan_center_wise, box_breaking, summary_statement)
 * @returns {Promise<Array>} Array of templates with id and name
 */
export const getTemplates = async (type) => {
  try {
    const response = await API.get('/api/templates', {
      params: { type }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

/**
 * Download report file
 * @param {Object} params - Download parameters
 * @param {number} params.groupId - Selected group ID
 * @param {string} params.type - Report type
 * @param {number} params.template - Template ID (optional)
 * @returns {Promise<void>}
 */
export const downloadReport = async ({ groupId, type, template }) => {
  try {
    const params = {
      groupId,
      type,
    };
    
    if (template) {
      params.template = template;
    }

    const response = await API.get('/api/report/download', {
      params,
      responseType: 'blob', // Important for file download
    });

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'report.pdf';
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
};

/**
 * Preview report in new tab
 * @param {Object} params - Preview parameters
 * @param {number} params.groupId - Selected group ID
 * @param {string} params.type - Report type
 * @param {number} params.template - Template ID (optional)
 * @returns {Promise<void>}
 */
export const previewReport = async ({ groupId, type, template }) => {
  try {
    const params = new URLSearchParams({
      groupId: groupId.toString(),
      type,
    });
    
    if (template) {
      params.append('template', template.toString());
    }

    // Get the base URL from the API instance
    const baseURL = API.defaults.baseURL;
    const token = localStorage.getItem('token');
    
    // Construct the full URL with token in header (for preview)
    const previewUrl = `${baseURL}/api/report/preview?${params.toString()}`;
    
    // Open in new tab with authorization
    const newWindow = window.open(previewUrl, '_blank');
    
    if (!newWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }
  } catch (error) {
    console.error('Error previewing report:', error);
    throw error;
  }
};
