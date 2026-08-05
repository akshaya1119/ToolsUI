// src/stores/ProjectData.js (or store.js)
import { create } from "zustand";

const useStore = create((set) => ({
  projectName: localStorage.getItem("selectedProjectName") || "",
  projectId: localStorage.getItem("selectedProjectId") || "",
  groupId: localStorage.getItem("selectedGroup") || "",
  typeId: localStorage.getItem("selectedType") || "",
  selectedLot: localStorage.getItem("selectedLot") ? parseInt(localStorage.getItem("selectedLot")) : null,
  allProjects: [],
  allGroups: [],
  nrDataCount: 0,
  headerCorrectionCount: 0,
  isConfigured: false,
  isLoadingData: true, // Keep guards from redirecting before initial fetch
  hasDeactivatedCatches: false,  
  staleEnvLotIds: JSON.parse(localStorage.getItem("staleEnvLotIds") || "[]"),

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
    localStorage.removeItem("selectedLot");
    set({ projectName: "", projectId: "", groupId: "", typeId: "", selectedLot: null, nrDataCount: 0, headerCorrectionCount: 0, isConfigured: false });
  },

  // Action to set selected lot
  setSelectedLot: (lotNo) => {
    if (lotNo === null) {
      localStorage.removeItem("selectedLot");
    } else {
      localStorage.setItem("selectedLot", lotNo);
    }
    set({ selectedLot: lotNo });
  },

  setAllProjects: (projects) => set({ allProjects: projects }),
  setAllGroups: (groups) => set({ allGroups: groups }),
  setNrDataCount: (count) => set({ nrDataCount: count }),
  setHeaderCorrectionCount: (count) => set({ headerCorrectionCount: count }),
  setIsConfigured: (status) => set({ isConfigured: status }),
  setIsLoadingData: (status) => set({ isLoadingData: status }), // ✅ Action to set loading status
  setHasDeactivatedCatches: (status) => set({ hasDeactivatedCatches: status }),  // ✅ Set deactivated catches flag

  // ✅ Actions for specific EnvLot staleness
  addStaleEnvLotIds: (envLotIds) => set((state) => {
    const nextList = [...new Set([...state.staleEnvLotIds, ...envLotIds])];
    localStorage.setItem("staleEnvLotIds", JSON.stringify(nextList));
    return { staleEnvLotIds: nextList };
  }),
  removeStaleEnvLotIds: (envLotIds) => set((state) => {
    const nextList = state.staleEnvLotIds.filter(id => !envLotIds.includes(id));
    localStorage.setItem("staleEnvLotIds", JSON.stringify(nextList));
    return { staleEnvLotIds: nextList };
  }),
  clearStaleEnvLotIds: () => set(() => {
    localStorage.removeItem("staleEnvLotIds");
    return { staleEnvLotIds: [] };
  }),
}));

export default useStore;
