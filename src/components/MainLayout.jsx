import { useState, cloneElement, isValidElement } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserTokenActions } from "../stores/UserToken";

export default function MainLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState("");
  const [dashboardView, setDashboardView] = useState("groups");
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { clearToken } = useUserTokenActions();

  const handleLogout = () => {
    clearToken();
    navigate('/login')
  };

  const handleDashboardSearchChange = (query, view, group) => {
    // Only update if values actually changed to prevent loops
    if (query !== dashboardSearchQuery) {
      setDashboardSearchQuery(query);
    }
    if (view !== dashboardView) {
      setDashboardView(view);
    }
    if (group?.id !== selectedGroup?.id) {
      setSelectedGroup(group);
    }
  };

  // Only show search on dashboard page
  const isDashboardPage = location.pathname === '/dashboard';
  
  // Dynamic placeholder - always allow searching groups
  const searchPlaceholder = isDashboardPage 
    ? "Search groups or projects..." 
    : "Search...";

  // Clone children and pass search props if it's Dashboard component
  const enhancedChildren = isValidElement(children) && isDashboardPage
    ? cloneElement(children, {
        externalSearchQuery: dashboardSearchQuery,
        onSearchQueryChange: handleDashboardSearchChange
      })
    : children;

 return (
    <div className="flex flex-col h-screen w-screen">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
        searchQuery={isDashboardPage ? dashboardSearchQuery : ""}
        onSearchChange={isDashboardPage ? setDashboardSearchQuery : () => {}}
        searchPlaceholder={isDashboardPage ? searchPlaceholder : "Search..."}
      />

      {/* Body layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Scrollable main content only */}
        <main className="flex flex-col flex-1 overflow-y-auto p-6 bg-gray-50">
          {enhancedChildren}
        </main>
      </div>

    </div>
  );
}
