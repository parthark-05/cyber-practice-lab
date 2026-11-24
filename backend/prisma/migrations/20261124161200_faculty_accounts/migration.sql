-- CreateTable
CREATE TABLE "faculty_accounts" (
    "id" UUID NOT NULL,
    "facultyId" VARCHAR(24) NOT NULL,
    "passwordHash" VARCHAR(256),
    "setupCodeHash" VARCHAR(256),
    "setupExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_sessions" (
    "id" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "facultyId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_sessions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "classrooms" ADD COLUMN "facultyId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "faculty_accounts_facultyId_key" ON "faculty_accounts"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_sessions_tokenHash_key" ON "faculty_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "faculty_sessions_facultyId_expiresAt_idx" ON "faculty_sessions"("facultyId", "expiresAt");

-- CreateIndex
CREATE INDEX "classrooms_facultyId_createdAt_idx" ON "classrooms"("facultyId", "createdAt");

-- AddForeignKey
ALTER TABLE "faculty_sessions" ADD CONSTRAINT "faculty_sessions_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
