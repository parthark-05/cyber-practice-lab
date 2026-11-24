import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./db.js";
import { hashSecret, hashSessionToken, verifySecret } from "./auth-crypto.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const frontendDistPath = fileURLToPath(new URL("../../frontend/dist/", import.meta.url));
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const labSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const demoUsnPattern = /^DEMO-CY-[0-9]{3}$/;
const studentCookieName = "cpl_student_session";
const facultyCookieName = "cpl_faculty_session";
const adminCookieName = "cpl_admin_session";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const authFailures = new Map();
const adminSessions = new Map();
const adminKeyHashPromise = process.env.ADMIN_ACCESS_KEY
  ? hashSecret(process.env.ADMIN_ACCESS_KEY)
  : null;
const dummyPasswordHashPromise = hashSecret(randomBytes(16).toString("hex"));

function measurePasswordStrength(password) {
  const lowered = password.toLowerCase();
  const looksCommon = ["password", "qwerty", "letmein", "welcome", "admin", "12345678"]
    .some((part) => lowered.includes(part));
  const characterTypes = [/[a-z]/.test(password), /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)]
    .filter(Boolean).length;

  if (looksCommon || /^(.)\1+$/.test(password)) return 1;
  if (password.length >= 12 && (characterTypes >= 3 || password.length >= 16)) return 3;
  if (password.length >= 8 && (characterTypes >= 2 || password.length >= 12)) return 2;
  return 1;
}

// Only allow the Vite dev server to call this API from a browser.
app.use(cors({ origin: frontendOrigin, credentials: true, methods: ["GET", "POST"] }));
app.use(express.json({ limit: "16kb" }));

function getSessionToken(req, cookieName = studentCookieName) {
  const cookies = (req.headers.cookie || "").split(";");
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${cookieName}=`));
  return entry ? entry.trim().slice(cookieName.length + 1) : "";
}

function setSessionCookie(res, token, cookieName = studentCookieName) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionLifetimeMs / 1000}${secure}`
  );
}

function clearSessionCookie(res, cookieName = studentCookieName) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
  );
}

function authAttemptKey(req, usn) {
  return `${req.ip}|${usn}`;
}

function hasReachedAttemptLimit(key, limit) {
  const attempt = authFailures.get(key);
  if (!attempt) return false;
  if (attempt.resetAt <= Date.now()) {
    authFailures.delete(key);
    return false;
  }
  return attempt.count >= limit;
}

function isAuthRateLimited(key, identityLimit = 5, ipLimit = 30) {
  const separator = key.indexOf("|");
  const ipKey = `${key.slice(0, separator)}|*`;
  return hasReachedAttemptLimit(key, identityLimit) || hasReachedAttemptLimit(ipKey, ipLimit);
}

function incrementAttemptCount(key, now) {
  const previous = authFailures.get(key);
  if (!previous || previous.resetAt <= now) {
    authFailures.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
  } else {
    previous.count += 1;
  }
}

function recordAuthFailure(key) {
  const now = Date.now();
  const separator = key.indexOf("|");
  const ipKey = `${key.slice(0, separator)}|*`;
  incrementAttemptCount(key, now);
  if (ipKey !== key) incrementAttemptCount(ipKey, now);
  // Bound the in-memory demo limiter if arbitrary IDs are submitted.
  if (authFailures.size > 10000) {
    for (const [savedKey, savedAttempt] of authFailures) {
      if (savedAttempt.resetAt <= now) authFailures.delete(savedKey);
    }
    if (authFailures.size > 10000) {
      const oldestKey = authFailures.keys().next().value;
      if (oldestKey) authFailures.delete(oldestKey);
    }
  }
}

async function startStudentSession(student, res) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  await prisma.studentSession.create({
    data: {
      studentId: student.id,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });
  setSessionCookie(res, token);
  return { usn: student.usn };
}

async function findStudentSession(req) {
  const token = getSessionToken(req);
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;

  const session = await prisma.studentSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { student: { select: { id: true, usn: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.studentSession.delete({ where: { id: session.id } });
    return null;
  }
  return session;
}

async function requireStudent(req, res, next) {
  try {
    const session = await findStudentSession(req);
    if (!session) return res.status(401).json({ error: "Sign in to access student progress." });
    req.student = session.student;
    next();
  } catch (error) {
    next(error);
  }
}

async function findFacultySession(req) {
  const token = getSessionToken(req, facultyCookieName);
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const session = await prisma.facultySession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { faculty: { select: { id: true, facultyId: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.facultySession.delete({ where: { id: session.id } });
    return null;
  }
  return session;
}

async function requireFaculty(req, res, next) {
  try {
    const session = await findFacultySession(req);
    if (!session) return res.status(401).json({ error: "Faculty sign-in is required to create a class." });
    req.faculty = session.faculty;
    next();
  } catch (error) {
    next(error);
  }
}

async function startFacultySession(faculty, res) {
  const token = randomBytes(32).toString("hex");
  await prisma.facultySession.create({
    data: {
      facultyId: faculty.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + sessionLifetimeMs),
    },
  });
  setSessionCookie(res, token, facultyCookieName);
  return { facultyId: faculty.facultyId };
}

// Simple check that the server is running (does not touch the database).
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Student accounts in this build are fictional demo records. The USN is an
// identifier, not a secret; the setup code and chosen password are secrets.
app.post("/api/student/activate", async (req, res, next) => {
  const usn = typeof req.body?.usn === "string" ? req.body.usn.trim().toUpperCase() : "";
  const setupCode = typeof req.body?.setupCode === "string" ? req.body.setupCode.trim().toUpperCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";
  const key = authAttemptKey(req, usn || "unknown");

  if (isAuthRateLimited(key)) {
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  }
  if (!demoUsnPattern.test(usn) || !/^[A-F0-9]{32}$/.test(setupCode)) {
    recordAuthFailure(key);
    return res.status(400).json({ error: "USN or setup code is invalid, or the code has expired." });
  }
  if (password.length > 128 || measurePasswordStrength(password) < 2 || password !== confirmPassword) {
    return res.status(400).json({ error: "Use a matching password of at least medium strength (8 or more characters)." });
  }

  try {
    const student = await prisma.studentAccount.findUnique({ where: { usn } });
    const validCode = Boolean(
      student?.setupCodeHash &&
      student.setupExpiresAt &&
      student.setupExpiresAt > new Date() &&
      !student.passwordHash &&
      (await verifySecret(setupCode, student.setupCodeHash))
    );
    if (!validCode) {
      recordAuthFailure(key);
      return res.status(400).json({ error: "USN or setup code is invalid, or the code has expired." });
    }

    const passwordHash = await hashSecret(password);
    // Claim the one-time code atomically. A second simultaneous request will
    // see count 0 after the first request clears the code and cannot activate.
    const claimed = await prisma.studentAccount.updateMany({
      where: {
        id: student.id,
        passwordHash: null,
        setupCodeHash: student.setupCodeHash,
        setupExpiresAt: { gt: new Date() },
      },
      data: { passwordHash, setupCodeHash: null, setupExpiresAt: null },
    });
    if (claimed.count !== 1) {
      recordAuthFailure(key);
      return res.status(400).json({ error: "USN or setup code is invalid, or the code has expired." });
    }
    const activatedStudent = { id: student.id, usn: student.usn };
    authFailures.delete(key);
    const currentStudent = await startStudentSession(activatedStudent, res);
    res.status(201).json({ student: currentStudent });
  } catch (error) {
    next(error);
  }
});

app.post("/api/student/login", async (req, res, next) => {
  const usn = typeof req.body?.usn === "string" ? req.body.usn.trim().toUpperCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const key = authAttemptKey(req, usn || "unknown");

  if (isAuthRateLimited(key)) {
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  }
  if (!demoUsnPattern.test(usn) || password.length > 128) {
    recordAuthFailure(key);
    return res.status(401).json({ error: "USN or password is incorrect." });
  }

  try {
    const student = await prisma.studentAccount.findUnique({ where: { usn } });
    const passwordHash = student?.passwordHash || (await dummyPasswordHashPromise);
    const validPassword = await verifySecret(password, passwordHash);
    if (!student?.passwordHash || !validPassword) {
      recordAuthFailure(key);
      return res.status(401).json({ error: "USN or password is incorrect." });
    }

    authFailures.delete(key);
    const currentStudent = await startStudentSession(student, res);
    res.json({ student: currentStudent });
  } catch (error) {
    next(error);
  }
});

app.get("/api/student/me", async (req, res, next) => {
  try {
    const session = await findStudentSession(req);
    if (!session) return res.status(401).json({ error: "Not signed in." });
    res.json({ student: { usn: session.student.usn } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/student/logout", async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    if (/^[a-f0-9]{64}$/i.test(token)) {
      await prisma.studentSession.deleteMany({
        where: { tokenHash: hashSessionToken(token) },
      });
    }
    clearSessionCookie(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Fictional faculty demo access uses its own login and session cookie.
app.post("/api/faculty/activate", async (req, res, next) => {
  const facultyId = typeof req.body?.facultyId === "string" ? req.body.facultyId.trim().toUpperCase() : "";
  const setupCode = typeof req.body?.setupCode === "string" ? req.body.setupCode.trim().toUpperCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";
  const key = authAttemptKey(req, facultyId || "unknown");

  if (isAuthRateLimited(key)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  if (facultyId !== "DEMO-FAC-001" || !/^[A-F0-9]{32}$/.test(setupCode)) {
    recordAuthFailure(key);
    return res.status(400).json({ error: "Faculty ID or setup code is invalid, or the code has expired." });
  }
  if (password.length > 128 || measurePasswordStrength(password) < 2 || password !== confirmPassword) {
    return res.status(400).json({ error: "Use a matching password of at least medium strength (8 or more characters)." });
  }

  try {
    const faculty = await prisma.facultyAccount.findUnique({ where: { facultyId } });
    const validCode = Boolean(
      faculty?.setupCodeHash && faculty.setupExpiresAt && faculty.setupExpiresAt > new Date() &&
      !faculty.passwordHash && await verifySecret(setupCode, faculty.setupCodeHash)
    );
    if (!validCode) {
      recordAuthFailure(key);
      return res.status(400).json({ error: "Faculty ID or setup code is invalid, or the code has expired." });
    }

    const passwordHash = await hashSecret(password);
    // Atomically consume the setup code so concurrent requests cannot both win.
    const claimed = await prisma.facultyAccount.updateMany({
      where: {
        id: faculty.id,
        passwordHash: null,
        setupCodeHash: faculty.setupCodeHash,
        setupExpiresAt: { gt: new Date() },
      },
      data: { passwordHash, setupCodeHash: null, setupExpiresAt: null },
    });
    if (claimed.count !== 1) {
      recordAuthFailure(key);
      return res.status(400).json({ error: "Faculty ID or setup code is invalid, or the code has expired." });
    }
    const activeFaculty = { id: faculty.id, facultyId: faculty.facultyId };
    authFailures.delete(key);
    res.status(201).json({ faculty: await startFacultySession(activeFaculty, res) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/faculty/login", async (req, res, next) => {
  const facultyId = typeof req.body?.facultyId === "string" ? req.body.facultyId.trim().toUpperCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const key = authAttemptKey(req, facultyId || "unknown");
  if (isAuthRateLimited(key)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  if (facultyId !== "DEMO-FAC-001" || password.length > 128) {
    recordAuthFailure(key);
    return res.status(401).json({ error: "Faculty ID or password is incorrect." });
  }

  try {
    const faculty = await prisma.facultyAccount.findUnique({ where: { facultyId } });
    const passwordHash = faculty?.passwordHash || await dummyPasswordHashPromise;
    const validPassword = await verifySecret(password, passwordHash);
    if (!faculty?.passwordHash || !validPassword) {
      recordAuthFailure(key);
      return res.status(401).json({ error: "Faculty ID or password is incorrect." });
    }
    authFailures.delete(key);
    res.json({ faculty: await startFacultySession(faculty, res) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/faculty/me", async (req, res, next) => {
  try {
    const session = await findFacultySession(req);
    if (!session) return res.status(401).json({ error: "Not signed in." });
    res.json({ faculty: { facultyId: session.faculty.facultyId } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/faculty/logout", async (req, res, next) => {
  try {
    const token = getSessionToken(req, facultyCookieName);
    if (/^[a-f0-9]{64}$/i.test(token)) {
      await prisma.facultySession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    }
    clearSessionCookie(res, facultyCookieName);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Developer access is configured only on the server. Sessions are kept in
// memory, so a server restart safely signs the developer out.
app.post("/api/admin/login", async (req, res, next) => {
  const key = typeof req.body?.key === "string" ? req.body.key : "";
  const attemptKey = authAttemptKey(req, "admin");
  if (isAuthRateLimited(attemptKey, 5, 5)) {
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  }
  if (!adminKeyHashPromise) {
    return res.status(503).json({ error: "Developer access has not been configured." });
  }
  try {
    if (key.length > 64 || !(await verifySecret(key, await adminKeyHashPromise))) {
      recordAuthFailure(attemptKey);
      return res.status(401).json({ error: "That access code is incorrect." });
    }
    authFailures.delete(attemptKey);
    authFailures.delete(authAttemptKey(req, "*"));
    if (adminSessions.size > 100) {
      for (const [sessionHash, expiry] of adminSessions) {
        if (expiry <= Date.now()) adminSessions.delete(sessionHash);
      }
    }
    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + sessionLifetimeMs;
    adminSessions.set(hashSessionToken(token), expiresAt);
    setSessionCookie(res, token, adminCookieName);
    res.json({ admin: { label: "Developer" } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/me", (req, res) => {
  const token = getSessionToken(req, adminCookieName);
  const tokenHash = /^[a-f0-9]{64}$/i.test(token) ? hashSessionToken(token) : "";
  const expiresAt = adminSessions.get(tokenHash);
  if (!expiresAt || expiresAt <= Date.now()) {
    if (tokenHash) adminSessions.delete(tokenHash);
    return res.status(401).json({ error: "Not signed in." });
  }
  res.json({ admin: { label: "Developer" } });
});

app.post("/api/admin/logout", (req, res) => {
  const token = getSessionToken(req, adminCookieName);
  if (/^[a-f0-9]{64}$/i.test(token)) adminSessions.delete(hashSessionToken(token));
  clearSessionCookie(res, adminCookieName);
  res.status(204).end();
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

// Return the signed-in student's completed labs.
app.get("/api/progress", requireStudent, async (req, res, next) => {
  const learnerId = req.student.id;
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

// Record a completion for the signed-in student and a published lab.
app.post("/api/progress", requireStudent, async (req, res, next) => {
  const learnerId = req.student.id;
  const { labSlug } = req.body ?? {};

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

// Create a demo classroom without collecting teacher or student personal data.
// A join code identifies a class; it is not an authentication credential.
app.post("/api/classes", requireFaculty, async (req, res, next) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const labSlugs = req.body?.labSlugs;

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: "Class name must be 2 to 80 characters." });
  }

  if (
    !Array.isArray(labSlugs) ||
    labSlugs.length < 1 ||
    labSlugs.length > 20 ||
    labSlugs.some((slug) => typeof slug !== "string" || !labSlugPattern.test(slug))
  ) {
    return res.status(400).json({ error: "Choose between 1 and 20 valid labs." });
  }

  try {
    const uniqueSlugs = [...new Set(labSlugs)];
    const labs = await prisma.lab.findMany({
      where: { slug: { in: uniqueSlugs }, published: true },
      select: { id: true, slug: true, title: true },
    });

    if (labs.length !== uniqueSlugs.length) {
      return res.status(400).json({ error: "One or more selected labs are unavailable." });
    }

    const classroom = await prisma.classroom.create({
      data: {
        name,
        faculty: { connect: { id: req.faculty.id } },
        // Six random bytes provide a 12-character demo code.
        joinCode: randomBytes(6).toString("hex").toUpperCase(),
        labs: { connect: labs.map(({ id }) => ({ id })) },
      },
      select: {
        id: true,
        name: true,
        joinCode: true,
        createdAt: true,
        labs: { select: { slug: true, title: true } },
      },
    });

    res.status(201).json({ classroom });
  } catch (error) {
    next(error);
  }
});

// Look up a class by its short code so learners can see the assigned labs.
// The response contains only the class name and published lab details.
app.get("/api/classes/:joinCode", async (req, res, next) => {
  const joinCode = req.params.joinCode.trim().toUpperCase();
  const attemptKey = authAttemptKey(req, "class-lookup");

  // Keep previously issued 8-character demo codes working; new codes use 12.
  if (!/^(?:[A-F0-9]{8}|[A-F0-9]{12})$/.test(joinCode)) {
    return res.status(400).json({ error: "Enter a valid class code (8 or 12 characters)." });
  }
  if (isAuthRateLimited(attemptKey, 30, 30)) {
    return res.status(429).json({ error: "Too many class code checks. Try again in 15 minutes." });
  }
  // Count all well-formed lookups, including successful ones, to slow code guessing.
  recordAuthFailure(attemptKey);

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { joinCode },
      select: {
        name: true,
        labs: {
          where: { published: true },
          orderBy: { title: "asc" },
          select: { slug: true, title: true, difficulty: true, estimatedMinutes: true },
        },
      },
    });

    if (!classroom) {
      return res.status(404).json({ error: "No class was found for that code." });
    }

    res.json({ classroom });
  } catch (error) {
    next(error);
  }
});

// Unknown routes
if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendDistPath, { index: false }));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
      return res.sendFile(join(frontendDistPath, "index.html"));
    }
    next();
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler: log details on the server, send a safe message to the client.
app.use((error, req, res, next) => {
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }

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
