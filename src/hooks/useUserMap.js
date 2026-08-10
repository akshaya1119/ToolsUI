import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// External ERP User API — source of truth for user names
const ERP_USER_API = 'http://192.168.10.208:82/API/api/User';

/**
 * Decode the stored JWT and return the numeric userId from the "userid" claim.
 * Returns null if no valid token is present.
 */
export const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    // JWT payload is the second base64-url segment
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    // The backend sets a custom "userid" claim (lowercase)
    const id = payload['userid'] ?? payload['unique_name'] ?? payload['sub'] ?? null;
    const num = id !== null ? Number(id) : null;
    return num && !isNaN(num) ? num : null;
  } catch {
    return null;
  }
};

/**
 * Hook to fetch all users from the ERP User API and build a userId → firstName map.
 */
export const useUserMap = () => {
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Try the ERP User API first (source of truth for names)
        let users = [];
        try {
          const res = await axios.get(ERP_USER_API, { headers });
          users = Array.isArray(res.data) ? res.data
            : Array.isArray(res.data?.$values) ? res.data.$values
            : [];
        } catch {
          // Fallback to internal API if ERP is unreachable
          if (API_BASE) {
            const res = await axios.get(`${API_BASE}/User`, { headers });
            users = Array.isArray(res.data) ? res.data
              : Array.isArray(res.data?.$values) ? res.data.$values
              : [];
          }
        }

        // Build userId → display name map (keyed by both number and string for safe lookup)
        const map = {};
        users.forEach(user => {
          const id = user.userId ?? user.UserId ?? user.id ?? user.Id;
          if (id == null) return;
          const name = user.firstName || user.FirstName
            || user.userName || user.Username || user.UserName
            || `User ${id}`;
          map[Number(id)] = name;
          map[String(id)] = name;
        });

        setUserMap(map);
      } catch (err) {
        console.error('Failed to fetch user map:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { userMap, loading, error };
};

/**
 * Returns the display name for a userId from the map.
 * Tries both numeric and string keys to handle type mismatches.
 */
export const getFirstNameFromUserId = (userId, userMap) => {
  if (userId == null || !userMap) return null;
  return userMap[Number(userId)] || userMap[String(userId)] || null;
};
