import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaHome, FaWrench, FaChartBar, FaSignOutAlt, FaBookmark, FaBook, FaChevronDown, FaChevronRight } from "react-icons/fa"; // Using filled versions from FontAwesome
import useStore from "../stores/ProjectData";
import API from "../hooks/api";
import Footer from "./Footer";
import { getCurrentUserRoleId } from "../hooks/useUserMap";

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});
  const roleId = getCurrentUserRoleId();
  const isRoleAuthorized = roleId === null || (Number(roleId) <= 4 && Number(roleId) > 0);

  // Subscribe to Zustand store for projectName (optimizing re-renders)
  const projectName = useStore((state) => state.projectName);
  const projectId = useStore((state) => state.projectId);
  const nrDataCount = useStore((state) => state.nrDataCount);
  const setNrDataCount = useStore((state) => state.setNrDataCount);
  const headerCorrectionCount = useStore((state) => state.headerCorrectionCount);
  const setHeaderCorrectionCount = useStore((state) => state.setHeaderCorrectionCount);
  const isConfigured = useStore((state) => state.isConfigured);
  const setIsConfigured = useStore((state) => state.setIsConfigured);
  const setIsLoadingData = useStore((state) => state.setIsLoadingData);
  const resetProject = useStore((state) => state.resetProject);

  useEffect(() => {
    const fetchData = async () => {
      if (projectId) {
        setIsLoadingData(true);
        try {
          // Fetch NR data counts
          const countsRes = await API.get(`/NRDatas/Counts?ProjectId=${projectId}`);
          const count = countsRes.data.nrData || countsRes.data.NrData || 0;
          setNrDataCount(count);

          // Fetch project configuration status
          const configRes = await API.get(`/ProjectConfigs/ByProject/${projectId}`);
          setIsConfigured(!!configRes.data);

          // Fetch Header Verification remarks count
          try {
            const hvRes = await API.get(`/Correction/HeaderVerification/${projectId}?pageSize=1&page=1`);
            const hvCount = hvRes.data?.summary?.correctionCount ?? hvRes.data?.summary?.hasRemarkCount ?? 0;
            setHeaderCorrectionCount(hvCount);
          } catch (e) {
            console.error("Failed to fetch header verification remarks count", e);
          }
        } catch (err) {
          console.error("Failed to fetch project data", err);
          // Don't reset everything on error, but maybe log it
        } finally {
          setIsLoadingData(false);
        }
      }
    };
    fetchData();
  }, [projectId, setNrDataCount, setHeaderCorrectionCount, setIsConfigured]);

  // Auto-expand group if current path is a child
  useEffect(() => {
    const isToolsChild = [
      "/projectconfiguration",
      "/dataimport",
      "/changedNRUpload",
      "/projecttemplates",
      "/processingpipeline",
      "/processingpipelinev2",
      "/headerverification"
    ].includes(location.pathname);

    if (isToolsChild) {
      setOpenGroups((prev) => ({ ...prev, Tools: true }));
    }
  }, [location.pathname]);

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
            { label: "Changed NR Analysis", path: "/changedNRUpload" },
            { label: "Project Templates", path: "/projecttemplates" },
            {
              label: "Processing Pipeline",
              path: "/processingpipeline",
              disabled: nrDataCount === 0 || !isConfigured
            },
            {
              label: "Processing Pipeline V2",
              path: "/processingpipelinev2",
              disabled: nrDataCount === 0 || !isConfigured
            },
            {
              label: "Header Verification",
              path: "/headerverification",
              badge: isRoleAuthorized ? headerCorrectionCount : null,
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

  const SidebarItem = ({ label, icon, path, disabled, active, isChild = false, badge = null, isFlyoutChild = false }) => {
    const isActive = active || location.pathname === path;
    const isDisabled = disabled;

    const activeClass = isActive
      ? `bg-blue-100 text-blue-700 font-medium ${collapsed && !isFlyoutChild ? "" : "border-l-4 border-blue-500"}`
      : "text-gray-700 hover:bg-gray-100";

    const disabledClass = "text-gray-400 cursor-not-allowed";

    let baseClass = "flex items-center justify-between cursor-pointer transition-all duration-150 relative group ";
    if (isFlyoutChild) {
      baseClass += "px-4 py-2 text-sm border-l-4 border-transparent hover:border-l-4 hover:border-blue-400 " + (isDisabled ? disabledClass : activeClass);
    } else {
      baseClass += "px-3 py-2 rounded-md " +
        (isChild ? "text-sm pl-6 mt-1 " : "") +
        (isDisabled ? disabledClass : activeClass) +
        (collapsed && !isChild ? " justify-center" : " gap-3");
    }

    const getDisabledTooltipText = (lbl) => {
      if (!isDisabled) return undefined;
      if (lbl === "Data Import") return "Add Configuration to enable.";
      if (lbl === "Processing Pipeline" || lbl === "Processing Pipeline V2") return "Upload NR Data to enable.";
      return "Currently unavailable";
    };

    return (
      <li onClick={() => !isDisabled && navigate(path)} className={baseClass}>
        <div className={`relative flex items-center min-w-0 ${isFlyoutChild ? "gap-2" : "gap-3"}`}>
          <div className="relative flex items-center justify-center">
            {icon && <span className={`${(collapsed && !isChild && !isFlyoutChild) ? "text-2xl" : "text-base"} shrink-0`}>{icon}</span>}
            {collapsed && !isFlyoutChild && badge !== null && badge !== undefined && Number(badge) > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
            )}
          </div>

          {(!collapsed || isChild || isFlyoutChild) && (
            <span className="truncate peer">{label}</span>
          )}

          {/* Tooltip for disabled items in expanded sidebar or flyout */}
          {(!collapsed || isFlyoutChild) && isDisabled && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 
              opacity-0 peer-hover:opacity-100 pointer-events-none
              bg-gray-800 text-white text-[11px] px-2 py-1 rounded-md whitespace-nowrap
              shadow-lg transition-all duration-200 z-[60]">
              {getDisabledTooltipText(label)}
            </div>
          )}

          {/* Tooltip for collapsed sidebar (only for top-level non-flyout items) */}
          {collapsed && !isChild && !isFlyoutChild && (
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 
              opacity-0 group-hover:opacity-100 pointer-events-none
              bg-gray-800 text-white text-[12px] px-2.5 py-1.5 rounded-md whitespace-nowrap
              shadow-lg transition-all duration-200 z-[60]">
              {label}
              {isDisabled && <span className="block text-gray-300 text-[10px] mt-0.5">
                {getDisabledTooltipText(label)}
              </span>}
            </div>
          )}
        </div>

        {/* Count Badge when expanded or in flyout */}
        {(!collapsed || isFlyoutChild) && badge !== null && badge !== undefined && Number(badge) > 0 && (
          <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-600 text-white shadow-sm min-w-[20px] flex-shrink-0">
            {badge}
          </span>
        )}
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
      badge={item.badge}
    />
  );

  const renderGroupItem = (group) => {
    const isOpen = openGroups[group.label];
    const groupBadgeCount = group.children?.reduce((sum, child) => sum + (Number(child.badge) || 0), 0) || 0;
    const isGroupActive = group.children?.some(child => location.pathname === child.path);

    return (
      <li key={group.label} className="flex flex-col relative group">
        <div
          onClick={() => !collapsed && toggleGroup(group.label)}
          className={`flex items-center justify-between px-3 py-2 rounded-md transition-all duration-150 
            ${collapsed ? "justify-center cursor-default" : "cursor-pointer"} 
            ${isGroupActive ? "bg-blue-100 text-blue-700 font-medium " + (collapsed ? "" : "border-l-4 border-blue-500") : "text-gray-800 hover:bg-gray-100"}`}
        >
          <div className="relative flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className={`${collapsed ? "text-2xl" : "text-base"} shrink-0`}>{group.icon}</span>
              {collapsed && groupBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
              )}
            </div>
            {!collapsed && <span className={isGroupActive ? "font-medium" : ""}>{group.label}</span>}
          </div>

          {!collapsed && (
            <div className="flex items-center gap-2 ml-auto">
              {!isOpen && groupBadgeCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-600 text-white shadow-sm min-w-[20px]">
                  {groupBadgeCount}
                </span>
              )}
              <span>
                {isOpen ? <FaChevronDown className="text-black" /> : <FaChevronRight className="text-black" />}
              </span>
            </div>
          )}

          {/* Flyout Menu for Collapsed Sidebar */}
          {collapsed && (
            <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-[60] bg-white border border-gray-200 rounded-lg shadow-xl min-w-[220px] overflow-hidden">
              <div className="px-4 py-3 font-semibold text-gray-800 border-b border-gray-100 bg-gray-50/80">
                {group.label}
              </div>
              <ul className="py-2 flex flex-col">
                {group.children.map((child) => (
                  <SidebarItem
                    key={child.label}
                    label={child.label}
                    path={child.path}
                    disabled={child.disabled}
                    badge={child.badge}
                    isChild={true}
                    isFlyoutChild={true}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Child menu items for Expanded Sidebar */}
        {!collapsed && isOpen && (
          <ul className="space-y-1">
            {group.children.map((child) => (
              <SidebarItem
                key={child.label}
                label={child.label}
                path={child.path}
                disabled={child.disabled}
                badge={child.badge}
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
    <aside className={`${collapsed ? "w-16 px-2 py-2" : "w-64 p-4"} bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col`}>
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
            className={`flex items-center px-3 py-2 rounded-md cursor-pointer text-gray-800 hover:bg-gray-100 transition-all duration-150 relative group ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <FaSignOutAlt className={`${collapsed ? "text-2xl" : "text-base"} shrink-0`} />
            {!collapsed && <span>Logout</span>}

            {collapsed && (
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 
                opacity-0 group-hover:opacity-100 pointer-events-none
                bg-gray-800 text-white text-[12px] px-2.5 py-1.5 rounded-md whitespace-nowrap
                shadow-lg transition-all duration-200 z-[60]">
                Logout
              </div>
            )}
          </div>
        )}
        <Footer collapsed={collapsed} />
      </div>
    </aside>
  );
}
