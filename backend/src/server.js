import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./db.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// Only allow the Vite dev server to call this API from a browser.
app.use(cors({ origin: frontendOrigin, methods: ["GET"] }));

// Simple check that the server is running (does not touch the database).
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Returns all published labs from PostgreSQL.
app.get("/api/labs", async (req, res, next) => {
  try {
    const labs = await prisma.lab.findMany({
      where: { published: true },
      orderBy: [{ createdAt: "asc" }, { title: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        difficulty: true,
        estimatedMinutes: true,
        tags: true,
        createdAt: true,
      },
    });

    res.json({ labs });
  } catch (error) {
    next(error); // hand the error to the error handler below
  }
});

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler: log details on the server, send a safe message to the client.
app.use((error, req, res, next) => {
  console.error("Request failed:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({ error: "Something went wrong on the server." });
});

const server = app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});

// Shut down cleanly when you press Ctrl+C.
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);