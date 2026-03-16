import React, { useState, useEffect } from "react";
import API from "./hooks/api";
import useStore from "./stores/ProjectData";
import axios from "axios";
import { useNavigate, Link } from 'react-router-dom';


const url = import.meta.env.VITE_API_BASE_URL; // Assuming this is the correct URL for fetching project names

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [correctionGroups, setCorrectionGroups] = useState(0);
  const [recentProjects, setRecentProjects] = useState([]);
  const token = localStorage.getItem("token");
  const setProject = useStore((state) => state.setProject);
  const navigate = useNavigate();

  const getProjects = async () => {
    try {
      const response = await API.get('/Projects/UserId');
      const projectIds = response.data.map((config) => config.projectId);

      const projectNameRequests = projectIds.map((projectId) =>
        axios.get(`${url}/Project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const projectNameResponses = await Promise.all(projectNameRequests);

      // Combine ID and name in one object
      const combinedProjects = response.data.map((project, index) => {
        const projData = projectNameResponses[index].data;
        console.log(projData)
        return {
          id: project.projectId,
          name: projData.name,
          timeAgo: project.timeAgo,
          groupId: projData.groupId,
          typeId: projData.typeId,
        };
      });

      setProjects(combinedProjects);  // Store array of { id, name }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const getCorrectionGroups = async () => {
    try {
      const res = await axios.get(`${url}/Groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCorrectionGroups(res.data.length);
    } catch (err) {
      console.error("Failed to fetch correction groups:", err);
    }
  };


  useEffect(() => {
    getProjects();
    getCorrectionGroups();
  }, []);

  const handleCardClick = (projectId, projectName, groupId, typeId) => {
    // Save selected projectId and projectName in localStorage
    localStorage.setItem("selectedProjectId", projectId);
    localStorage.setItem("selectedGroup", groupId || "");
    localStorage.setItem("selectedType", typeId || "");
    localStorage.setItem("selectedProjectName", projectName);
    setProject(projectName, projectId, groupId || "", typeId || "");
    navigate("/projectdashboard");
  };

  return (
    <>
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Welcome to ERP Tools!</h2>
        <p className="text-gray-600 mt-2">Select an existing project below or create a new one to get started.</p>
        <div className="mt-4">
          <button onClick={() => navigate('/masters')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold">
            Create New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-600">
          <h3 className="text-gray-600 text-sm">Total Projects</h3>
          <p className="text-3xl font-bold text-blue-800">{projects.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
          <h3 className="text-gray-600 text-sm">Masters</h3>
          <p className="text-3xl font-bold text-yellow-700">6 <span className="text-lg font-normal">Types</span></p>
          <Link to="/masters" className="text-sm text-yellow-800 hover:underline mt-1 block">Manage &rarr;</Link>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-600">
          <h3 className="text-gray-600 text-sm">Correction Tool</h3>
          <p className="text-3xl font-bold text-green-800">{correctionGroups} <span className="text-lg font-normal">Groups Ready</span></p>
          <Link to="/correctiontool" className="text-sm text-green-700 hover:underline mt-1 block">Go to Tool &rarr;</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Select a Project</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {console.log(projects)}
            {!projects || projects.length === 0 ? (<p>No projects available.</p>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-400 hover:shadow-xl hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                  onClick={() => handleCardClick(project.id, project.name, project.groupId, project.typeId)}
                >
                  <h3 className="text-gray-800 text-lg font-semibold mb-2 truncate"
                    title={project.name}
                  >{project.name}</h3>
                  <p className="text-sm text-gray-500">Last accessed: {project.timeAgo}</p>
                </div>
              )))}
          </div>
        </div>

      </div>
    </>
  );
}
