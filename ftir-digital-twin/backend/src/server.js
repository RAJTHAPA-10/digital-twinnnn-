import "dotenv/config";
import app from "./app.js";

const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`FTIR Digital Twin API running on http://localhost:${port}`);
});

const shutdown = () => {
  console.log("\nShutting down backend server...");

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);