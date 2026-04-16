/**
 * Cache utility functions for managing localStorage cache
 */

const CACHE_KEYS = {
  GROUPS: 'cached_groups',
  GROUPS_TIMESTAMP: 'cached_groups_timestamp',
};

const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

/**
 * Clear groups cache - call this when groups are modified
 */
export const clearGroupsCache = () => {
  localStorage.removeItem(CACHE_KEYS.GROUPS);
  localStorage.removeItem(CACHE_KEYS.GROUPS_TIMESTAMP);
};

/**
 * Get cached groups if available and not expired
 */
export const getCachedGroups = () => {
  const cachedGroups = localStorage.getItem(CACHE_KEYS.GROUPS);
  const cacheTimestamp = localStorage.getItem(CACHE_KEYS.GROUPS_TIMESTAMP);
  const now = Date.now();

  if (cachedGroups && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_EXPIRY) {
    return JSON.parse(cachedGroups);
  }
  return null;
};

/**
 * Set groups cache
 */
export const setCachedGroups = (groups) => {
  localStorage.setItem(CACHE_KEYS.GROUPS, JSON.stringify(groups));
  localStorage.setItem(CACHE_KEYS.GROUPS_TIMESTAMP, Date.now().toString());
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
};
