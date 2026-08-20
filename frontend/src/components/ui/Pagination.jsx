import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Pagination = ({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  siblingCount = 1, // Số lượng số trang hiển thị bên cạnh trang hiện tại
  className = "",
}) => {
  const totalPageCount = Math.ceil(totalCount / pageSize);

  // Thuật toán tính toán dãy số trang (ví dụ: [1, '...', 4, 5, 6, '...', 10])
  const paginationRange = React.useMemo(() => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPageCount) {
      return Array.from({ length: totalPageCount }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPageCount,
    );

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "DOTS", totalPageCount];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPageCount - rightItemCount + i + 1,
      );
      return [firstPageIndex, "DOTS", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i,
      );
      return [firstPageIndex, "DOTS", ...middleRange, "DOTS", lastPageIndex];
    }
  }, [totalCount, pageSize, siblingCount, currentPage]);

  if (currentPage === 0 || paginationRange.length < 2) {
    return null;
  }

  const onNext = () => {
    if (currentPage < totalPageCount) onPageChange(currentPage + 1);
  };

  const onPrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  return (
    <nav
      className={cn("flex items-center justify-center gap-1.5 mt-6", className)}
      aria-label="Pagination"
    >
      {/* Nút Previous */}
      <button
        onClick={onPrevious}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Danh sách các trang */}
      <div className="flex items-center gap-1.5">
        {paginationRange.map((pageNumber, index) => {
          if (pageNumber === "DOTS") {
            return (
              <span key={`dots-${index}`} className="px-2 text-gray-400">
                <MoreHorizontal size={16} />
              </span>
            );
          }

          const isActive = pageNumber === currentPage;

          return (
            <button
              key={index}
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "min-w-[40px] h-10 flex items-center justify-center rounded-lg text-sm font-semibold transition-all cursor-pointer",
                isActive
                  ? "bg-[#006ce4] text-white shadow-md shadow-blue-200"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#006ce4] hover:text-[#006ce4]",
              )}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      {/* Nút Next */}
      <button
        onClick={onNext}
        disabled={currentPage === totalPageCount}
        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
};

export default Pagination;
