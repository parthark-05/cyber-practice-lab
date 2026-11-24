import { randomBytes } from "node:crypto";
import { prisma } from "../src/db.js";
import { hashSecret } from "../src/auth-crypto.js";

// Fictional sample labs with safe, educational descriptions only.
const labs = [
  {
    slug: "input-validation",
    title: "Input validation",
    description:
      "Learn why applications should treat all user input as untrusted, and practice checking, cleaning, and rejecting unexpected values in a safe sandbox.",
    difficulty: "BEGINNER",
    estimatedMinutes: 30,
    tags: ["web", "forms", "validation"],
    published: true,
  },
  {
    slug: "access-control",
    title: "Access control",
    description:
      "Explore how roles and permissions limit who can view or change data, and practice reviewing a sample app's permission rules to find gaps.",
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 45,
    tags: ["permissions", "roles", "authorization"],
    published: true,
  },
  {
    slug: "secure-configuration",
    title: "Secure configuration",
    description:
      "Review a sample application's settings against a security checklist and practice choosing safer defaults.",
    difficulty: "ADVANCED",
    estimatedMinutes: 40,
    tags: ["hardening", "settings", "defaults"],
    published: true,
  },
];

// Fictional demo-only students. Never replace these with a real roster in Git.
const demoStudents = ["DEMO-CY-001", "DEMO-CY-002", "DEMO-CY-003"];
const demoFaculty = ["DEMO-FAC-001"];

async function main() {
  // upsert = create the lab, or update it if the slug already exists,
  // so running the seed twice does not create duplicates.
  for (const lab of labs) {
    await prisma.lab.upsert({
      where: { slug: lab.slug },
      update: lab,
      create: lab,
    });
  }

  const newStudentCodes = [];
  for (const usn of demoStudents) {
    const existing = await prisma.studentAccount.findUnique({ where: { usn } });
    if (existing?.passwordHash) continue;

    const setupCode = randomBytes(16).toString("hex").toUpperCase();
    const credentials = {
      setupCodeHash: await hashSecret(setupCode),
      setupExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    if (existing) {
      await prisma.studentAccount.update({ where: { id: existing.id }, data: credentials });
    } else {
      await prisma.studentAccount.create({ data: { usn, ...credentials } });
    }
    newStudentCodes.push({ usn, setupCode });
  }

  console.log(`Seeded ${labs.length} labs.`);
  if (newStudentCodes.length > 0) {
    console.log("One-time setup codes for fictional demo students (valid 24 hours):");
    for (const { usn, setupCode } of newStudentCodes) {
      console.log(`${usn}: ${setupCode}`);
    }
  }

  const newFacultyCodes = [];
  for (const facultyId of demoFaculty) {
    const existing = await prisma.facultyAccount.findUnique({ where: { facultyId } });
    if (existing?.passwordHash) continue;

    const setupCode = randomBytes(16).toString("hex").toUpperCase();
    const credentials = {
      setupCodeHash: await hashSecret(setupCode),
      setupExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    if (existing) {
      await prisma.facultyAccount.update({ where: { id: existing.id }, data: credentials });
    } else {
      await prisma.facultyAccount.create({ data: { facultyId, ...credentials } });
    }
    newFacultyCodes.push({ facultyId, setupCode });
  }

  if (newFacultyCodes.length > 0) {
    console.log("One-time setup codes for fictional demo faculty (valid 24 hours):");
    for (const { facultyId, setupCode } of newFacultyCodes) {
      console.log(`${facultyId}: ${setupCode}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
