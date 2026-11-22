import { prisma } from "../src/db.js";

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

  console.log(`Seeded ${labs.length} labs.`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });