/**
 * 1. Định dạng tiền tệ VND chuẩn (Ví dụ: 1.500.000 ₫)
 * @param {number|string} amount - Số tiền cần định dạng
 * @returns {string} Chuỗi tiền tệ đã định dạng
 */
export const formatCurrency = (amount = 0) => {
  const numericAmount = Number(amount);
  const safeAmount = isNaN(numericAmount) ? 0 : numericAmount;

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0, // Tiền VND không có số thập phân lẻ
  }).format(safeAmount);
};

/**
 * 2. Định dạng số tiền thuần không có ký hiệu ₫ (Ví dụ: 1.500.000)
 */
export const formatNumber = (num = 0) => {
  const numericNum = Number(num);
  const safeNum = isNaN(numericNum) ? 0 : numericNum;

  return new Intl.NumberFormat("vi-VN").format(safeNum);
};

/**
 * 3. Định dạng tiền rút gọn cho nhãn / badge nhỏ (Ví dụ: 150k, 2.5M)
 */
export const formatCompactPrice = (amount = 0) => {
  const num = Number(amount) || 0;
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + "k";
  }
  return num.toString();
};

/**
 * 4. Định dạng ngày tháng tiếng Việt (Ví dụ: 20/08/2026)
 */
export const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
};
