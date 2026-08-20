import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Table = ({
  columns = [], // [{ key, label, sortable, render }]
  data = [],
  isLoading = false,
  pagination = {
    currentPage: 1,
    totalPages: 1,
    onPageChange: () => {},
  },
  onSort = () => {}, // (key, direction)
  className = "",
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    onSort(key, direction);
  };

  return (
    <div
      className={cn(
        "w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden",
        className,
      )}
    >
      {/* 1. Container bọc table để scroll ngang trên mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          {/* Header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-6 py-4 font-semibold text-gray-700 whitespace-nowrap",
                    col.sortable &&
                      "cursor-pointer hover:bg-gray-100 transition-colors select-none",
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable && (
                      <span className="text-gray-400">
                        {sortConfig.key !== col.key && (
                          <ArrowUpDown size={14} />
                        )}
                        {sortConfig.key === col.key &&
                          sortConfig.direction === "asc" && (
                            <ArrowUp size={14} className="text-[#006ce4]" />
                          )}
                        {sortConfig.key === col.key &&
                          sortConfig.direction === "desc" && (
                            <ArrowDown size={14} className="text-[#006ce4]" />
                          )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              // Loading Skeleton
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4 text-gray-600 whitespace-nowrap"
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              // Empty State
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  Không có dữ liệu hiển thị
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 2. Pagination (Phân trang) */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-sm text-gray-500">
            Trang{" "}
            <span className="font-semibold text-gray-700">
              {pagination.currentPage}
            </span>{" "}
            / {pagination.totalPages}
          </p>

          <div className="flex items-center gap-1">
            <PaginationButton
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.currentPage === 1}
            >
              <ChevronsLeft size={18} />
            </PaginationButton>

            <PaginationButton
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              disabled={pagination.currentPage === 1}
            >
              <ChevronLeft size={18} />
            </PaginationButton>

            {/* Hiển thị danh sách số trang (logic rút gọn) */}
            <div className="flex items-center px-2 font-medium text-sm">
              {pagination.currentPage}
            </div>

            <PaginationButton
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              disabled={pagination.currentPage === pagination.totalPages}
            >
              <ChevronRight size={18} />
            </PaginationButton>

            <PaginationButton
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              <ChevronsRight size={18} />
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
};

// Nút phân trang phụ
const PaginationButton = ({ children, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 transition-all cursor-pointer",
      "hover:bg-gray-50 hover:text-[#006ce4] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white",
    )}
  >
    {children}
  </button>
);

export default Table;
