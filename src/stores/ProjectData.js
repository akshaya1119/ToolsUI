// src/stores/ProjectData.js (or store.js)
import { create } from "zustand";

const useStore = create((set) => ({
  projectName: localStorage.getItem("selectedProjectName") || "",
  projectId: localStorage.getItem("selectedProjectId") || "",
  groupId: localStorage.getItem("selectedGroup") || "",
  typeId: localStorage.getItem("selectedType") || "",
  allProjects: [],
  allGroups: [],
  nrDataCount: 0,
  isConfigured: false,
  isLoadingData: true, // Keep guards from redirecting before initial fetch
  hasDeactivatedCatches: false,  

  // Action to set project name and id
  setProject: (name, id, groupId, typeId) => {
    localStorage.setItem("selectedProjectName", name);
    localStorage.setItem("selectedProjectId", id);
    localStorage.setItem("selectedGroup", groupId || "");
    localStorage.setItem("selectedType", typeId || "");
    set({ projectName: name, projectId: id, groupId: groupId || "", typeId: typeId || "" });
  },

  // Action to reset project data
  resetProject: () => {
    localStorage.removeItem("selectedProjectName");
    localStorage.removeItem("selectedProjectId");
    localStorage.removeItem("selectedGroup");
    localStorage.removeItem("selectedType");
    set({ projectName: "", projectId: "", groupId: "", typeId: "", nrDataCount: 0, isConfigured: false });
  },

  setAllProjects: (projects) => set({ allProjects: projects }),
  setAllGroups: (groups) => set({ allGroups: groups }),
  setNrDataCount: (count) => set({ nrDataCount: count }),
  setIsConfigured: (status) => set({ isConfigured: status }),
  setIsLoadingData: (status) => set({ isLoadingData: status }), // ✅ Action to set loading status
  setHasDeactivatedCatches: (status) => set({ hasDeactivatedCatches: status }),  // ✅ Set deactivated catches flag
}));

export default useStore;
