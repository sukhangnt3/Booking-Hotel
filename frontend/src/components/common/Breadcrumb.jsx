// src/components/common/Breadcrumb.jsx
import React from "react";
import { Link } from "react-router-dom";

const Breadcrumb = ({ items = [] }) => {
  return (
    <nav className="flex text-xs text-gray-500 font-medium">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <span className="mx-2 text-gray-400">/</span>}
            {item.link ? (
              <Link
                to={item.link}
                className="hover:text-[#006ce4] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-800 font-bold">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
