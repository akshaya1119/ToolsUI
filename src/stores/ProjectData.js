// src/stores/ProjectData.js (or store.js)
import { create } from "zustand";

const useStore = create((set) => ({
  projectName: localStorage.getItem("selectedProjectName") || "",
  projectId: localStorage.getItem("selectedProjectId") || "",

  // Action to set project name and id
  setProject: (name, id, groupId, typeId) => {
    localStorage.setItem("selectedProjectName", name);
    localStorage.setItem("selectedProjectId", id);
    localStorage.setItem("selectedGroup", groupId);
    localStorage.setItem("selectedType", typeId);
    set({ projectName: name, projectId: id, groupId, typeId });
  },

  // Action to reset project data
  resetProject: () => {
    localStorage.removeItem("selectedProjectName");
    localStorage.removeItem("selectedProjectId");
    localStorage.removeItem("selectedGroup");
    localStorage.removeItem("selectedType");
    set({ projectName: "", projectId: "", groupId: "", typeId: "" });
  },
}));

export default useStore;
