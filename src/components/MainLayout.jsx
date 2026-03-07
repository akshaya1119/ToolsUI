import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";
import { useUserTokenActions } from "../stores/UserToken";

export default function MainLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { clearToken } = useUserTokenActions();

  const handleLogout = () => {
    clearToken();
    navigate('/login')
  };  

 return (
    <div className="flex flex-col h-screen w-screen">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Body layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Scrollable main content only */}
        <main className="flex flex-col flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>

      {/* Footer outside scrollable area */}
      <Footer />
    </div>
  );
}
