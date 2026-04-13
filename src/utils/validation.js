/**
 * Utility to validate required fields in an object.
 */
export const validateRequiredFields = (data, fields) => {
  const missing = fields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  });

  return {
    isValid: missing.length === 0,
    missing: missing
  };
};
