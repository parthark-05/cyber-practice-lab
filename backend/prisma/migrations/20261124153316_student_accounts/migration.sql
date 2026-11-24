-- CreateTable
CREATE TABLE "student_accounts" (
    "id" UUID NOT NULL,
    "usn" VARCHAR(20) NOT NULL,
    "passwordHash" VARCHAR(256),
    "setupCodeHash" VARCHAR(256),
    "setupExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_sessions" (
    "id" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "studentId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_accounts_usn_key" ON "student_accounts"("usn");

-- CreateIndex
CREATE UNIQUE INDEX "student_sessions_tokenHash_key" ON "student_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "student_sessions_studentId_expiresAt_idx" ON "student_sessions"("studentId", "expiresAt");

-- AddForeignKey
ALTER TABLE "student_sessions" ADD CONSTRAINT "student_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
