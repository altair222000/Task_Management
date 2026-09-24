const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDatabase = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// All routers
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const taskRoute = require("./routes/task");
const analyticsRoute = require("./routes/analytics");

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Task_Management!",
    frontend_url: process.env.FRONTEND_URL,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Health check for Railway
app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "error",
    database: connected ? mongoose.connection.name : "disconnected",
  });
});

// All routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/task", taskRoute);
app.use("/api/analytics", analyticsRoute);

// Invalid routes
app.all("*", (req, res) => {
  res.status(404).json({ error: "Invalid Route" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const errorMessage = err.message || "Something Went Wrong!";
  res.status(500).json({ message: errorMessage });
});

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start application:", error.message);
    process.exit(1);
  }
}

startServer();
