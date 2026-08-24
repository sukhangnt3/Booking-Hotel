const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "GoStay - Booking Hotel API",
      version: "1.0.0",
      description:
        "API quản lý đặt phòng khách sạn GoStay. Hỗ trợ đặt phòng, thanh toán, yêu thích, đánh giá, quản trị admin.",
    },
    servers: [
      { url: "http://localhost:5000/api", description: "Local server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Xác thực người dùng" },
      { name: "Hotels", description: "Quản lý khách sạn" },
      { name: "Bookings", description: "Quản lý đặt phòng" },
      { name: "Favorites", description: "Yêu thích khách sạn" },
      { name: "Payments", description: "Thanh toán" },
      { name: "Promotions", description: "Khuyến mãi" },
      { name: "Reviews", description: "Đánh giá" },
      { name: "Rooms", description: "Quản lý phòng" },
      { name: "Admin", description: "Quản trị viên" },
      { name: "Notifications", description: "Thông báo" },
      { name: "Health", description: "Kiểm tra kết nối" },
    ],
  },
  apis: ["./routes/*.js", "./admin/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;