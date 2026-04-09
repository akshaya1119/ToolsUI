import React from "react";

const Footer = ({ collapsed = false }) => {
  return (
    <div className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-500 text-center">
      <div>&copy; {new Date().getFullYear()} ERP Tools</div>
      <div>All rights reserved.</div>
    </div>
  );
};

export default Footer;
