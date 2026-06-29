function notFoundHandler(req, res) {
  res.status(404).json({
    message: "Không tìm thấy API.",
  });
}

function errorHandler(error, req, res, next) {
  console.error(error);

  res.status(500).json({
    message: process.env.NODE_ENV === "production"
      ? "Máy chủ gặp lỗi."
      : error.message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
