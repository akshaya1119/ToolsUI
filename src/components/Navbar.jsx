import React, { useState } from "react";
import { FiMenu, FiChevronDown } from "react-icons/fi";
import { Search } from "lucide-react";
import { useToast } from "./../hooks/useToast";

export default function Navbar({ onToggleSidebar, onLogout, searchQuery, onSearchChange, searchPlaceholder = "Search..." }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { showToast } = useToast();

  return (
    <nav className="bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-50">
      {/* Left: Menu + Branding */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-gray-700 hover:text-blue-600 focus:outline-none"
        >
          <FiMenu className="text-2xl" />
        </button>
        <span className="font-bold text-xl text-gray-800 hidden md:inline">ERP Tools</span>
      </div>

      {/* Right: Search + Profile */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-72 pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 text-sm font-medium placeholder:text-slate-400 shadow-sm"
          />
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 text-gray-800 hover:text-blue-600 focus:outline-none font-medium"
          >
            <span>Profile</span>
            <FiChevronDown className="text-lg" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <ul className="py-1 text-sm text-gray-700">
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    showToast("Profile settings clicked.", "info");
                    setDropdownOpen(false);
                  }}
                >
                  Profile Settings   
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    onLogout();
                    setDropdownOpen(false);
                  }}
                >
                  Logout
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
