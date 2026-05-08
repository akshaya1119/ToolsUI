import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaHome, FaWrench, FaChartBar, FaSignOutAlt, FaBookmark, FaBook, FaChevronDown, FaChevronRight } from "react-icons/fa"; // Using filled versions from FontAwesome
import useStore from "../stores/ProjectData";
import API from "../hooks/api";
import Footer from "./Footer";

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  // Subscribe to Zustand store for projectName (optimizing re-renders)
  const projectName = useStore((state) => state.projectName);
  const projectId = useStore((state) => state.projectId);
  const nrDataCount = useStore((state) => state.nrDataCount);
  const setNrDataCount = useStore((state) => state.setNrDataCount);
  const isConfigured = useStore((state) => state.isConfigured);
  const setIsConfigured = useStore((state) => state.setIsConfigured);
  const resetProject = useStore((state) => state.resetProject);

  useEffect(() => {
    const fetchData = async () => {
      if (projectId) {
        try {
          // Fetch NR data counts
          const countsRes = await API.get(`/NRDatas/Counts?ProjectId=${projectId}`);
          const count = countsRes.data.nrData || countsRes.data.NrData || 0;
          setNrDataCount(count);

          // Fetch project configuration status
          const configRes = await API.get(`/ProjectConfigs/ByProject/${projectId}`);
          setIsConfigured(!!configRes.data);
        } catch (err) {
          console.error("Failed to fetch project data", err);
          // Don't reset everything on error, but maybe log it
        }
      }
    };
    fetchData();
  }, [projectId, setNrDataCount, setIsConfigured]);

  // Handle collapse toggle
  const toggleGroup = (groupKey) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const menuItems = [
    {
      label: projectName ? "Project Dashboard" : "Dashboard",
      icon: <FaHome className="text-black" />, // Filled version of home icon
      path: projectName ? "/projectdashboard" : "/dashboard",
    },
    {
      label: "Masters",
      icon: <FaBookmark className="text-black" />, // Filled version of bookmark icon
      path: "/masters",
    },
    ...(projectName
      ? [
        {
          label: "Tools",
          icon: <FaWrench className="text-black" />, // Filled wrench icon
          children: [
            { label: "Project Configuration", path: "/projectconfiguration" },
            { label: "Data Import", path: "/dataimport", disabled: !isConfigured },
            { label: "Project Templates", path: "/projecttemplates" },
            {
              label: "Processing Pipeline",
              path: "/processingpipeline",
              disabled: nrDataCount === 0 || !isConfigured
            },
            // { label: "RPT Reports", path: "/rptreports" },
          ],
        },
      ]
      : []),
    ...(projectName
      ? [
        {
          label: "Horizontal To Vertical Tool",
          icon: <FaWrench className="text-black" />, // Filled wrench icon
          path: "/horizontalToVertical"
        },
      ]
      : []
    ),
    ...(projectName
      ? [] // Don't show "Correction Tool" if projectName exists
      : [
        {
          label: "Correction Tool",
          icon: <FaWrench className="text-black" />, // Filled wrench icon
          children: [
            { label: "Excel Upload", path: "/excelupload" },
            { label: "Correction Tool", path: "/correctiontool" },
          ],
        },
      ]
    ),
  ,   
  ];

  const SidebarItem = ({ label, icon, path, disabled, active, isChild = false }) => {
    const isActive = active || location.pathname === path;
    const isDisabled = disabled;

    return (
      <li
        onClick={() => !isDisabled && navigate(path)}
        className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-150
          ${isChild ? "text-sm pl-6 mt-1" : ""}
          ${isDisabled ? "text-gray-400 cursor-not-allowed" : isActive ? "bg-blue-100 text-blue-700 border-l-4 border-blue-500 font-medium" : "text-gray-700 hover:bg-gray-100"}
          ${collapsed && !isChild ? "justify-center" : ""}`}
      >
        <div className="relative group flex items-center gap-3">
          {icon && <span className={collapsed ? "text-2xl" : "text-base"}>{icon}</span>}
          {(!collapsed || isChild) && <span>{label}</span>}
          
          {isDisabled && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 
              opacity-0 group-hover:opacity-100 pointer-events-none
              bg-blue-600 text-white text-[11px] px-2 py-1 rounded-md whitespace-nowrap
              shadow-lg transition-all duration-200 z-50">
              {label === "Data Import"
                ? "Add Configuration to enable"
                : "Upload NR data to enable"}
            </div>
          )}
        </div>
      </li>
    );
  };

  const renderMenuItem = (item) => (
    <SidebarItem
      key={item.label}
      label={item.label}
      icon={item.icon}
      path={item.path}
      disabled={item.disabled}
    />
  );

  const renderGroupItem = (group) => {
    const isOpen = openGroups[group.label];

    return (
      <li key={group.label} className="flex flex-col">
        <div
          onClick={() => toggleGroup(group.label)}
          className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-gray-800 hover:bg-gray-100 transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="flex items-center gap-3">
            <span className={collapsed ? "text-2xl" : "text-base"}>{group.icon}</span>
            {!collapsed && <span>{group.label}</span>}
          </div>
          {!collapsed && (
            <span className="ml-auto">
              {isOpen ? <FaChevronDown className="text-black" /> : <FaChevronRight className="text-black" />}
            </span>
          )}
        </div>

        {/* Child menu items */}
        {!collapsed && isOpen && (
          <ul className="space-y-1">
            {group.children.map((child) => (
              <SidebarItem
                key={child.label}
                label={child.label}
                path={child.path}
                disabled={child.disabled}
                isChild={true}
              />
            ))}
          </ul>
        )}
      </li>
    );
  };

  const handleLogout = () => {
    resetProject();
    navigate("/dashboard");
  };

  return (
    <aside className={`${collapsed ? "w-16" : "w-64"} bg-white border-r border-gray-200 p-4 transition-all duration-300 ease-in-out flex flex-col`}>
      {/* Logo / Heading */}
      <div className="mb-6">
        {!collapsed && (
          <h2 className="text-gray-800 text-xl font-bold tracking-wide">Tools Menu</h2>
        )}
      </div>

      {/* Project Name Display */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)" }} transition={{ duration: 0.3 }}>
        {!collapsed && projectName && (
          <div className="mb-6 flex items-center gap-2">
            <div className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm">
              Project : {projectName}
            </div>
          </div>
        )}
      </motion.div>

      {/* Menu Items */}
      <ul className="space-y-1">
        {menuItems.map((item) => (item.children ? renderGroupItem(item) : renderMenuItem(item)))}
      </ul>

      <div className="mt-auto">
        {/* Logout Button */}
        {projectName && (
          <div
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-gray-800 hover:bg-gray-100 transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
          >
            <FaSignOutAlt className={collapsed ? "text-2xl" : "text-base"} /> {/* Filled log-out icon */}
            {!collapsed && <span>Logout</span>}
          </div>
        )}
        <Footer collapsed={collapsed} />
      </div>
    </aside>
  );
}
