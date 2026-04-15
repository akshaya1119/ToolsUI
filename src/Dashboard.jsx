import { useState, useEffect, useMemo } from "react";
import API from "./hooks/api";
import useStore from "./stores/ProjectData";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { MdGroups } from "react-icons/md";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  Folder, 
  FileText, 
  ChevronLeft, 
  Search, 
  Plus, 
  Clock, 
  ChevronRight,
  Grid,
  List,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  Box,
  Pin,
  ChevronDown,
  ChevronUp,
  Archive
} from 'lucide-react';

const url = import.meta.env.VITE_API_BASE_URL;

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Dashboard Component
 * 
 * To integrate search with Navbar, pass these props to Navbar in parent component:
 * - searchQuery: The search query state from Dashboard
 * - onSearchChange: Function to update search query
 * - searchPlaceholder: Dynamic placeholder based on view
 * 
 * Example in parent:
 * <Navbar 
 *   searchQuery={dashboardSearchQuery}
 *   onSearchChange={setDashboardSearchQuery}
 *   searchPlaceholder={view === "groups" ? "Search groups..." : "Search projects..."}
 * />
 */
export default function Dashboard({ externalSearchQuery, onSearchQueryChange }) {
  const [projects, setProjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState("groups");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || "");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [pinnedGroups, setPinnedGroups] = useState(() => JSON.parse(localStorage.getItem("pinned_groups") || "[]"));
  const [pinnedProjects, setPinnedProjects] = useState(() => JSON.parse(localStorage.getItem("pinned_projects") || "[]"));
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);

  const token = localStorage.getItem("token");
  const setProject = useStore((state) => state.setProject);
  const navigate = useNavigate();

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== searchQuery) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Get selected group
  const selectedGroup = useMemo(() => 
    groups.find(g => g.id === selectedGroupId), 
    [groups, selectedGroupId]
  );

  // Notify parent of search query changes (debounced to prevent loops)
  useEffect(() => {
    if (onSearchQueryChange && searchQuery !== externalSearchQuery) {
      const timeoutId = setTimeout(() => {
        onSearchQueryChange(searchQuery, view, selectedGroup);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, view, selectedGroup?.id, onSearchQueryChange]); // Added onSearchQueryChange to deps

  const getProjects = async () => {
    setLoading(true);
    try {
      const response = await API.get('/Projects/UserId');
      const projectIds = response.data.map((config) => config.projectId);

      const projectNameRequests = projectIds.map((projectId) =>
        axios.get(`${url}/Project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const projectNameResponses = await Promise.all(projectNameRequests);
      const combinedProjects = response.data.map((project, index) => {
        const projData = projectNameResponses[index].data;
        return {
          id: project.projectId,
          name: projData.name,
          timeAgo: project.timeAgo,
          groupId: projData.groupId,
          typeId: projData.typeId,
          status: project.status,
        };
      });

      console.log("Combined Projects:", combinedProjects);
      // Filter out archived projects (where status is true)
      const activeProjects = combinedProjects.filter(p => !p.status);
      setProjects(activeProjects);  // Store array of active { id, name }

    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  const getGroupsAndTypes = async () => {
    try {
      const groupsRes = await axios.get(`${url}/Groups`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setGroups(groupsRes.data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  };

  const groupProjectCounts = useMemo(() => {
    const counts = {};
    const lastAccessed = {};
    
    projects.forEach(p => {
      // Only count active projects
      if (p.isActive !== false) {
        counts[p.groupId] = (counts[p.groupId] || 0) + 1;
        
        // Track last accessed project in each group
        if (!lastAccessed[p.groupId] || p.timeAgo < lastAccessed[p.groupId]) {
          lastAccessed[p.groupId] = p.timeAgo;
        }
      }
    });
    
    return { counts, lastAccessed };
  }, [projects]);

  useEffect(() => {
    getProjects();
    getGroupsAndTypes();
    
    // Auto-select group if user has access to only one group
    if (groups.length === 1 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
      setView("projects");
    }
  }, [groups.length]);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const recentProjects = projects.slice(0, 4);

  const handleGroupClick = (groupId) => {
    setSelectedGroupId(groupId);
    setSearchQuery(""); // Clear search when entering a group
    setView("projects");
    // Notify parent about view change
    const group = groups.find(g => g.id === groupId);
    if (onSearchQueryChange) {
      onSearchQueryChange("", "projects", group);
    }
  };

  const handleBackToGroups = () => {
    setView("groups");
    setSelectedGroupId(null);
    setSearchQuery(""); // Clear search when going back
    // Notify parent to update view and clear selected group
    if (onSearchQueryChange) {
      onSearchQueryChange("", "groups", null);
    }
  };

  const filteredGroups = useMemo(() => {
    // Always filter groups based on search, regardless of view
    // This allows searching for groups even when in projects view
    const filtered = groups.filter(group => 
      group.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ).sort((a, b) => (groupProjectCounts.counts[b.id] || 0) - (groupProjectCounts.counts[a.id] || 0));
    
    // Auto-select if only one group in search results and we're in groups view
    if (debouncedSearchQuery && filtered.length === 1 && view === "groups") {
      setTimeout(() => {
        handleGroupClick(filtered[0].id);
      }, 300);
    }
    
    return filtered;
  }, [groups, debouncedSearchQuery, groupProjectCounts]);

  const filteredProjects = useMemo(() => {
    if (view !== "projects") return [];
    
    // Search only within the selected group's projects
    return projects.filter(project => 
      project.groupId === selectedGroupId &&
      project.isActive !== false && // Only show active projects
      project.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [projects, selectedGroupId, debouncedSearchQuery, view]);

  const togglePinGroup = (e, groupId) => {
    e.stopPropagation();
    const newPinned = pinnedGroups.includes(groupId)
      ? pinnedGroups.filter(id => id !== groupId)
      : [...pinnedGroups, groupId];
    setPinnedGroups(newPinned);
    localStorage.setItem("pinned_groups", JSON.stringify(newPinned));
  };

  const togglePinProject = (e, projectId) => {
    e.stopPropagation();
    const newPinned = pinnedProjects.includes(projectId)
      ? pinnedProjects.filter(id => id !== projectId)
      : [...pinnedProjects, projectId];
    setPinnedProjects(newPinned);
    localStorage.setItem("pinned_projects", JSON.stringify(newPinned));
  };

  const categorizedGroups = useMemo(() => {
    const pinned = filteredGroups.filter(g => pinnedGroups.includes(g.id));
    const remaining = filteredGroups.filter(g => !pinnedGroups.includes(g.id));
    return { pinned, remaining };
  }, [filteredGroups, pinnedGroups]);

  const categorizedProjects = useMemo(() => {
    const pinned = filteredProjects.filter(p => pinnedProjects.includes(p.id));
    const remaining = filteredProjects.filter(p => !pinnedProjects.includes(p.id));
    return { pinned, remaining };
  }, [filteredProjects, pinnedProjects]);

  const handleCardClick = (projectId, projectName, groupId, typeId) => {
    localStorage.setItem("selectedProjectId", projectId);
    localStorage.setItem("selectedGroup", groupId || "");
    localStorage.setItem("selectedType", typeId || "");
    localStorage.setItem("selectedProjectName", projectName);
    setProject(projectName, projectId, groupId || "", typeId || "");
    navigate("/projectdashboard");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-50 rounded-full blur-[100px] opacity-40" />
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
        {/* Compact Header & Unified Action Bar */}
        <header className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 flex-shrink-0">
                <Box size={24} />
              </div>
              <AnimatePresence mode="wait">
                {view === "groups" ? (
                  <motion.div
                    key="titles-groups"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-slate-900 leading-none">Welcome to ERP Tools!</h1>
                    <p className="text-sm lg:text-base text-slate-500 font-medium mt-2">Select a business group to start Managing.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="titles-projects"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-3"
                  >
                    <button 
                      onClick={handleBackToGroups}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm group"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h1 className="text-2xl lg:text-3xl xl:text-4xl font-black text-slate-900 leading-none">{selectedGroup?.name}</h1>
                      <p className="text-xs lg:text-sm text-blue-600 font-bold uppercase tracking-widest mt-1">Project Workspace</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>


          </div>

          {/* Unified Action Bar */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-sm border border-white/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: Tool Quick Links */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/masters')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 text-slate-600 hover:text-blue-600 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 flex items-center justify-center group-hover:from-orange-500 group-hover:to-orange-600 group-hover:text-white transition-all shadow-sm">
                    <Grid size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-wider">Masters</p>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 mt-1">Manage Tools →</p>
                  </div>
                </button>
                
                <div className="h-12 w-px bg-slate-200" />
                
                <button 
                  onClick={() => navigate('/correctiontool')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 text-slate-600 hover:text-blue-600 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 flex items-center justify-center group-hover:from-emerald-500 group-hover:to-emerald-600 group-hover:text-white transition-all shadow-sm">
                    <TrendingUp size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-wider">Correction</p>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 mt-1">Go to Tool →</p>
                  </div>
                </button>
                <div className="h-12 w-px bg-slate-200" />
                
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/archive')} 
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 text-slate-600 hover:text-purple-600 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 flex items-center justify-center group-hover:from-purple-500 group-hover:to-purple-600 group-hover:text-white transition-all shadow-sm">
                    <Archive size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-wider">Archive</p>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-purple-600 mt-1">View Archived →</p>
                  </div>
                </motion.button>
                
                <div className="h-12 w-px bg-slate-200" />
                
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/masters', { state: { openProjectModal: true } })} 
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 text-slate-600 hover:text-indigo-600 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center group-hover:from-indigo-500 group-hover:to-indigo-600 group-hover:text-white transition-all shadow-sm">
                    <Plus size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-wider">Create</p>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 mt-1">New Project →</p>
                  </div>
                </motion.button>
              </div>

              {/* Right: View Toggles & Stats */}
              <div className="flex items-center gap-4">
                {view === "projects" && (
                  <>
                    <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        <Grid size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        <List size={18} />
                      </button>
                    </div>
                    <div className="h-10 w-px bg-slate-200" />
                  </>
                )}
                
                <div className="flex items-center gap-6">
                  <div className="text-center px-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 leading-none mb-1.5">Items</p>
                    <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                      {view === "groups" ? groups.length : filteredProjects.length}
                    </p>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <div className="text-center px-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 leading-none mb-1.5">Projects</p>
                    <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                      {projects.filter(p => p.isActive !== false).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>


        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin" />
              </div>
              <p className="mt-6 text-slate-500 font-medium animate-pulse">Initializing your workspace...</p>
            </motion.div>
          ) : view === "groups" ? (
            <motion.div
              key="groups-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Pinned Groups */}
              {categorizedGroups.pinned.length > 0 && !searchQuery && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Pin size={14} className="text-blue-600 fill-blue-600" />
                    <h2 className="text-xs font-bold text-slate-700 tracking-tight uppercase">Pinned Groups</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
                    {categorizedGroups.pinned.map((group, idx) => {
                      const count = groupProjectCounts.counts[group.id] || 0;
                      const lastAccessed = groupProjectCounts.lastAccessed[group.id] || 'Never';
                      return (
                        <motion.div
                          key={group.id}
                          layoutId={`group-${group.id}`}
                          onClick={() => handleGroupClick(group.id)}
                          className="group relative bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <MdGroups  size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 truncate text-sm lg:text-base">{group.name}</h3>
                            <p className="text-[10px] lg:text-xs text-slate-500 font-bold">{count} Projects</p>
                          </div>
                          <button 
                            onClick={(e) => togglePinGroup(e, group.id)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-blue-600 transition-colors"
                          >
                            <Pin size={14} className="fill-blue-600" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Recently Accessed */}
              {recentProjects.length > 0 && !searchQuery && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={14} className="text-emerald-500" />
                    <h2 className="text-xs font-bold text-slate-700 tracking-tight uppercase">Recent Work</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
                    {recentProjects.map((project, idx) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => handleCardClick(project.id, project.name, project.groupId, project.typeId)}
                        className="group bg-white p-4 lg:p-5 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                      >
                        <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Clock size={22} className="lg:w-6 lg:h-6" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="font-semibold text-slate-900 truncate text-sm lg:text-base">{project.name}</h3>
                          <p className="text-xs lg:text-sm text-slate-400 font-medium">{project.timeAgo}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Groups Grid */}
              <section>
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer group"
                  onClick={() => setIsGroupsExpanded(!isGroupsExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-600 transition-colors" />
                    <h2 className="text-xs font-bold text-slate-600 tracking-tight uppercase group-hover:text-slate-900">All Business Groups</h2>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                      {categorizedGroups.remaining.length}
                    </span>
                  </div>
                  {!searchQuery && categorizedGroups.remaining.length > 8 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                      {isGroupsExpanded ? "Show Less" : "Explore All"}
                      {isGroupsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  )}
                </div>
                
                <AnimatePresence>
                  {true && (
                    <motion.div 
                      key="all-groups"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {categorizedGroups.remaining.length === 0 ? (
                        <div className="py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                          <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 text-sm font-medium">No results found.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6 mt-2">
                          {(isGroupsExpanded || searchQuery || categorizedGroups.remaining.length <= 8 
                            ? categorizedGroups.remaining 
                            : categorizedGroups.remaining.slice(0, 8)
                          ).map((group, idx) => {
                            const count = groupProjectCounts.counts[group.id] || 0;
                            const lastAccessed = groupProjectCounts.lastAccessed[group.id] || 'Never';
                            const isPinned = pinnedGroups.includes(group.id);
                            return (
                              <motion.div
                                key={group.id}
                                layoutId={`group-${group.id}`}
                                onClick={() => handleGroupClick(group.id)}
                                className="group relative bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer flex flex-col justify-between min-h-[120px]"
                              >
                                <div className="flex justify-between items-start">
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                                    count > 0 ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
                                  }`}>
                                    <MdGroups  size={18} />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={(e) => togglePinGroup(e, group.id)}
                                      className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${isPinned ? "text-blue-600" : "text-slate-300 opacity-0 group-hover:opacity-100"}`}
                                    >
                                      <Pin size={14} className={isPinned ? "fill-blue-600" : ""} />
                                    </button>
                                    <div className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full text-[12px] font-bold">
                                      {count}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h3 className="text-base lg:text-lg xl:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight mt-3">
                                    {group.name}
                                  </h3>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Last accessed: {lastAccessed}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="projects-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Pinned Projects */}
              {categorizedProjects.pinned.length > 0 && !searchQuery && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Pin size={14} className="text-blue-600 fill-blue-600" />
                    <h2 className="text-xs font-bold text-slate-700 tracking-tight uppercase">Pinned Projects</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
                    {categorizedProjects.pinned.map((project, idx) => (
                      <motion.div
                        key={project.id}
                        layoutId={`project-${project.id}`}
                        onClick={() => handleCardClick(project.id, project.name, project.groupId, project.typeId)}
                        className="group relative bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 shadow-sm transition-all cursor-pointer flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <span className="font-bold text-xs">{project.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 truncate text-sm lg:text-base">{project.name}</h3>
                          <p className="text-[10px] lg:text-xs text-slate-400">{project.timeAgo}</p>
                        </div>
                        <button 
                          onClick={(e) => togglePinProject(e, project.id)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-blue-600 transition-colors"
                        >
                          <Pin size={14} className="fill-blue-600" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Group Search Results - Show when searching in projects view */}
              {searchQuery && filteredGroups.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Search size={14} className="text-blue-600" />
                    <h2 className="text-xs font-bold text-slate-700 tracking-tight uppercase">Groups matching "{searchQuery}"</h2>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                      {filteredGroups.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
                    {filteredGroups.map((group) => {
                      const count = groupProjectCounts.counts[group.id] || 0;
                      const lastAccessed = groupProjectCounts.lastAccessed[group.id] || 'Never';
                      const isPinned = pinnedGroups.includes(group.id);
                      return (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleGroupClick(group.id)}
                          className="group relative bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer flex flex-col justify-between min-h-[120px]"
                        >
                          <div className="flex justify-between items-start">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                              count > 0 ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
                            }`}>
                              <MdGroups size={18} />
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => togglePinGroup(e, group.id)}
                                className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${isPinned ? "text-blue-600" : "text-slate-300 opacity-0 group-hover:opacity-100"}`}
                              >
                                <Pin size={14} className={isPinned ? "fill-blue-600" : ""} />
                              </button>
                              <div className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full text-[12px] font-bold">
                                {count}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-base lg:text-lg xl:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight mt-3">
                              {group.name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Last accessed: {lastAccessed}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* All Projects */}
              <section>
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer group"
                  onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-600 transition-colors" />
                    <h2 className="text-xs font-bold text-slate-600 tracking-tight uppercase group-hover:text-slate-900">
                      {searchQuery ? "Search Results" : "All Projects"}
                    </h2>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                      {categorizedProjects.remaining.length}
                    </span>
                  </div>
                  {!searchQuery && categorizedProjects.remaining.length > 12 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                      {isProjectsExpanded ? "Show Less" : "Explore All"}
                      {isProjectsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  )}
                </div>

                  <AnimatePresence>
                    {true && (
                    <motion.div
                      key="all-projects"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {categorizedProjects.remaining.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <h3 className="text-base font-bold text-slate-800 mb-1">No Projects Found</h3>
                          <p className="text-slate-400 text-xs px-10">Try searching for something else or check your pinned items.</p>
                        </div>
                      ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6 mt-2">
                          {(isProjectsExpanded || searchQuery || categorizedProjects.remaining.length <= 12
                            ? categorizedProjects.remaining
                            : categorizedProjects.remaining.slice(0, 12)
                          ).map((project, idx) => (
                            <motion.div
                              key={project.id}
                              layoutId={`project-${project.id}`}
                              onClick={() => handleCardClick(project.id, project.name, project.groupId, project.typeId)}
                              className="group relative bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-bold group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:text-white transition-all">
                                  {project.name.substring(0, 2).toUpperCase()}
                                </div>
                                <button 
                                  onClick={(e) => togglePinProject(e, project.id)}
                                  className="p-1.5 rounded-md hover:bg-slate-50 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Pin size={14} />
                                </button>
                              </div>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                                {project.name}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-medium">
                                <Clock size={12} />
                                {project.timeAgo}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm mt-2">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50/50">
                              <tr>
                                <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-widest">Project</th>
                                <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-widest">Accessed</th>
                                <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-widest text-right">Pin</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(isProjectsExpanded || searchQuery || categorizedProjects.remaining.length <= 15
                                ? categorizedProjects.remaining
                                : categorizedProjects.remaining.slice(0, 15)
                              ).map((project) => (
                                <tr key={project.id} className="group hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => handleCardClick(project.id, project.name, project.groupId, project.typeId)}>
                                  <td className="px-5 py-3 font-bold text-slate-700">{project.name}</td>
                                  <td className="px-5 py-3 text-slate-400">{project.timeAgo}</td>
                                  <td className="px-5 py-3 text-right">
                                    <button 
                                      onClick={(e) => togglePinProject(e, project.id)}
                                      className="p-1.5 rounded-md text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                      <Pin size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
