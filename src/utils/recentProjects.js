/**
 * Manages the list of recently visited projects in localStorage
 */

const RECENT_PROJECTS_KEY = "recent_projects";
const MAX_RECENT = 4;

export const getRecentProjects = () => {
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading recent projects from localStorage:", error);
    return [];
  }
};

export const addRecentProject = (project) => {
  try {
    const recent = getRecentProjects();
    
    // Remove if already exists to move to top
    const filtered = recent.filter(p => p.id !== project.id);
    
    // Add new one at the beginning
    const updated = [
      {
        id: project.id,
        name: project.name,
        groupId: project.groupId,
        typeId: project.typeId,
        lastVisited: new Date().toISOString()
      },
      ...filtered
    ].slice(0, MAX_RECENT);
    
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error adding recent project to localStorage:", error);
    return [];
  }
};

/**
 * Simple time ago formatter
 */
export const formatTimeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now - past;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};
