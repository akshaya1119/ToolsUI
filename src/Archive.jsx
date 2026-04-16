import { useState, useEffect, useMemo } from "react";
import API from "./hooks/api";
import useStore from "./stores/ProjectData";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Archive, 
  Clock, 
  ChevronLeft,
  Grid,
  List,
  FileText,
  Box
} from 'lucide-react';

const url = import.meta.env.VITE_API_BASE_URL;

export default function ArchivePage() {
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const token = localStorage.getItem("token");
  const setProject = useStore((state) => state.setProject);
  const navigate = useNavigate();

  const getArchivedProjects = async () => {
    setLoading(true);
    try {
      const response = await API.get('/Projects/ArchivedProjects');
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
          isActive: project.isActive,
        };
      });
      setArchivedProjects(combinedProjects);
    } catch (err) {
      console.error("Failed to fetch archived projects", err);
    } finally {
      setLoading(false);
    }
  };

  const getGroups = async () => {
    try {
      // Check if groups are cached in localStorage
      const cachedGroups = localStorage.getItem("cached_groups");
      const cacheTimestamp = localStorage.getItem("cached_groups_timestamp");
      const now = Date.now();
      const cacheExpiry = 30 * 60 * 1000; // 30 minutes

      // Use cached data if available and not expired
      if (cachedGroups && cacheTimestamp && (now - parseInt(cacheTimestamp)) < cacheExpiry) {
        setGroups(JSON.parse(cachedGroups));
        return;
      }

      // Fetch from API if cache is invalid or expired
      const groupsRes = await axios.get(`${url}/Groups`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setGroups(groupsRes.data);
      
      // Cache the groups data
      localStorage.setItem("cached_groups", JSON.stringify(groupsRes.data));
      localStorage.setItem("cached_groups_timestamp", now.toString());
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  };

  useEffect(() => {
    getArchivedProjects();
    getGroups();
  }, []);

  const filteredProjects = useMemo(() => {
    return archivedProjects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [archivedProjects, searchQuery]);

  // Group projects by group
  const projectsByGroup = useMemo(() => {
    const grouped = {};
    filteredProjects.forEach(project => {
      if (!grouped[project.groupId]) {
        const group = groups.find(g => g.id === project.groupId);
        grouped[project.groupId] = {
          groupName: group?.name || 'Unknown Group',
          projects: []
        };
      }
      grouped[project.groupId].projects.push(project);
    });
    return grouped;
  }, [filteredProjects, groups]);

  const handleCardClick = (projectId, projectName, groupId, typeId) => {
    localStorage.setItem("selectedProjectId", projectId);
    localStorage.setItem("selectedGroup", groupId || "");
    localStorage.setItem("selectedType", typeId || "");
    localStorage.setItem("selectedProjectName", projectName);
    setProject(projectName, projectId, groupId || "", typeId || "");
    navigate("/projectdashboard");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-50 rounded-full blur-[100px] opacity-40" />
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                <Archive size={24} />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-slate-900 leading-none">Archived Projects</h1>
                <p className="text-sm lg:text-base text-slate-500 font-medium mt-2">View and manage inactive projects</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <List size={18} />
                </button>
              </div>
              
              <div className="text-center px-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 leading-none mb-1.5">Archived</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                  {archivedProjects.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-purple-50 border-t-purple-600 animate-spin" />
            </div>
            <p className="mt-6 text-slate-500 font-medium animate-pulse">Loading archived projects...</p>
          </div>
        ) : archivedProjects.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <Archive className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Archived Projects</h3>
            <p className="text-slate-400 text-sm px-10">You don't have any archived projects yet.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(projectsByGroup).map(([groupId, { groupName, projects }]) => (
              <section key={groupId}>
                <div className="flex items-center gap-2 mb-4">
                  <Box size={16} className="text-purple-600" />
                  <h2 className="text-sm font-bold text-slate-700 tracking-tight uppercase">{groupName}</h2>
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                    {projects.length}
                  </span>
                </div>

                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
                    {projects.map((project) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleCardClick(project.id, project.name, project.groupId, project.typeId)}
                        className="group relative bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-bold group-hover:from-purple-500 group-hover:to-purple-600 group-hover:text-white transition-all">
                            {project.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">
                            Archived
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 truncate transition-colors">
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
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-widest">Project</th>
                          <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-widest">Last Accessed</th>
                          <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {projects.map((project) => (
                          <tr 
                            key={project.id} 
                            className="group hover:bg-purple-50/30 transition-colors cursor-pointer" 
                            onClick={() => handleCardClick(project.id, project.name, project.groupId, project.typeId)}
                          >
                            <td className="px-5 py-3 font-bold text-slate-700">{project.name}</td>
                            <td className="px-5 py-3 text-slate-400">{project.timeAgo}</td>
                            <td className="px-5 py-3">
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">
                                Archived
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
