import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./db.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const labSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Only allow the Vite dev server to call this API from a browser.
app.use(cors({ origin: frontendOrigin, methods: ["GET", "POST"] }));
app.use(express.json({ limit: "16kb" }));

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

// Return the completed labs for one anonymous learner UUID.
app.get("/api/progress/:learnerId", async (req, res, next) => {
  const { learnerId } = req.params;

  if (!uuidPattern.test(learnerId)) {
    return res.status(400).json({ error: "learnerId must be a valid UUID." });
  }

  try {
    const records = await prisma.learnerProgress.findMany({
      where: { learnerId },
      orderBy: { completedAt: "desc" },
      select: {
        completedAt: true,
        lab: { select: { slug: true, title: true } },
      },
    });

    res.json({
      learnerId,
      completedLabs: records.map(({ lab, completedAt }) => ({
        slug: lab.slug,
        title: lab.title,
        completedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Record a completion once per learner and lab. The learner ID is anonymous;
// account authentication will be needed before this can support class tracking.
app.post("/api/progress", async (req, res, next) => {
  const { learnerId, labSlug } = req.body ?? {};

  if (typeof learnerId !== "string" || !uuidPattern.test(learnerId)) {
    return res.status(400).json({ error: "learnerId must be a valid UUID." });
  }

  if (typeof labSlug !== "string" || !labSlugPattern.test(labSlug)) {
    return res.status(400).json({ error: "labSlug is invalid." });
  }

  try {
    const lab = await prisma.lab.findFirst({
      where: { slug: labSlug, published: true },
      select: { id: true },
    });

    if (!lab) {
      return res.status(404).json({ error: "Published lab not found." });
    }

    const progress = await prisma.learnerProgress.upsert({
      where: {
        learnerId_labId: { learnerId, labId: lab.id },
      },
      update: {},
      create: { learnerId, labId: lab.id },
      select: {
        learnerId: true,
        completedAt: true,
        lab: { select: { slug: true, title: true } },
      },
    });

    res.status(200).json({
      progress: {
        learnerId: progress.learnerId,
        labSlug: progress.lab.slug,
        title: progress.lab.title,
        completedAt: progress.completedAt,
      },
    });
  } catch (error) {
    next(error);
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
