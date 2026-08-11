import React from "react";

const Footer = ({ collapsed = false }) => {
  if (collapsed) {
    return (
      <div className="mt-4 border-t border-gray-200 pt-3 text-gray-500 flex flex-col items-center justify-center cursor-default group relative">
        <span className="text-lg">&copy;</span>
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-800 text-white text-[11px] px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg transition-all duration-200 z-[60]">
          &copy; {new Date().getFullYear()} ERP Tools. All rights reserved.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-500 text-center">
      <div>&copy; {new Date().getFullYear()} ERP Tools</div>
      <div>All rights reserved.</div>
    </div>
  );
};

export default Footer;
