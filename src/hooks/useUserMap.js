import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Hook to fetch all users and create a map of userId -> firstName
 * This allows frontend to display user names from stored userIds
 */
export const useUserMap = () => {
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!API_BASE) {
         setLoading(false);
         return;
      }
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE}/User`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const users = response.data || [];
        
        // Create a map of userId -> firstName/displayName
        const map = {};
        users.forEach(user => {
          const userIdKey = user.userId ?? user.UserId;
          if (userIdKey) {
            map[userIdKey] = user.firstName || user.userName || user.Username || `User ${userIdKey}`;
          }
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
 * Helper function to get firstName from userId
 */
export const getFirstNameFromUserId = (userId, userMap) => {
  if (!userId || !userMap) return null;
  return userMap[userId] || userMap[String(userId)] || userMap[Number(userId)] || null;
};
