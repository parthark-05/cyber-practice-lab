-- CreateTable
CREATE TABLE "learner_progress" (
    "learnerId" UUID NOT NULL,
    "labId" UUID NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learner_progress_pkey" PRIMARY KEY ("learnerId","labId")
);

-- CreateIndex
CREATE INDEX "learner_progress_learnerId_completedAt_idx" ON "learner_progress"("learnerId", "completedAt");

-- AddForeignKey
ALTER TABLE "learner_progress" ADD CONSTRAINT "learner_progress_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
