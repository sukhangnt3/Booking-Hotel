// backend/swagger.js
const swaggerJSDoc = require("swagger-jsdoc");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "GoStay Booking API Documentation",
    version: "1.0.0",
    description:
      "Hệ thống API RESTful hoàn chỉnh cho nền tảng Đặt phòng Khách sạn & Quản lý Lưu trú GoStay (PostgreSQL).",
    contact: {
      name: "GoStay Support Team",
      email: "support@gostay.vn",
    },
  },
  servers: [
    {
      url: "http://localhost:5000/api",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Nhập token xác thực theo định dạng: Bearer <token>",
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./routes/*.js", "./admin/*.js", "./controllers/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
