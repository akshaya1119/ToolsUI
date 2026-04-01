import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaHome, FaWrench, FaChartBar, FaSignOutAlt, FaBookmark, FaBook, FaChevronDown, FaChevronRight } from "react-icons/fa"; // Using filled versions from FontAwesome
import useStore from "../stores/ProjectData";

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  // Subscribe to Zustand store for projectName (optimizing re-renders)
  const projectName = useStore((state) => state.projectName);
  const resetProject = useStore((state) => state.resetProject);

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
            { label: "Data Import", path: "/dataimport" },
            { label: "Project Templates", path: "/projecttemplates" },
            { label: "Processing Pipeline", path: "/processingpipeline" },
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

  const renderMenuItem = (item) => {
    const isActive = location.pathname === item.path;
    const isDisabled = item.disabled;

    return (
      <li
        key={item.label}
        onClick={() => !isDisabled && navigate(item.path)}
        className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer
          ${isDisabled ? "text-gray-400 cursor-not-allowed" : "text-gray-800 hover:bg-gray-100"}
          ${isActive ? "bg-blue-100 text-blue-700 border-l-4 border-blue-500 font-medium" : ""}
          transition-all duration-150
          ${collapsed ? "justify-center" : ""}`}
      >
        <span className={collapsed ? "text-2xl" : "text-base"}>{item.icon}</span>
        {!collapsed && <span>{item.label}</span>}
      </li>
    );
  };

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
          <ul className="ml-6 mt-1 space-y-1">
            {group.children.map((child) => {
              const isActive = location.pathname === child.path;
              return (
                <li
                  key={child.label}
                  onClick={() => navigate(child.path)}
                  className={`text-sm px-3 py-2 rounded-md cursor-pointer
                    ${isActive ? "bg-blue-100 text-blue-700 border-l-4 border-blue-500 font-medium" : "text-gray-700 hover:bg-gray-100"}
                    transition-all duration-150`}
                >
                  {child.label}
                </li>
              );
            })}
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

      {/* Logout Button */}
      {projectName && (
        <div onClick={handleLogout} className={`mt-auto flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-gray-800 hover:bg-gray-100 transition-all duration-150 ${collapsed ? "justify-center" : ""}`}>
          <FaSignOutAlt className={collapsed ? "text-2xl" : "text-base"} /> {/* Filled log-out icon */}
          {!collapsed && <span>Logout</span>}
        </div>
      )}
    </aside>
  );
}
