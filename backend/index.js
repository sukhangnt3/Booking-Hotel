const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend NodeJS đã hoạt động thành công!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server chạy tại port ${PORT}`));
