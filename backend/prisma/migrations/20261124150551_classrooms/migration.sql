-- CreateTable
CREATE TABLE "classrooms" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "joinCode" VARCHAR(12) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClassroomToLab" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ClassroomToLab_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_joinCode_key" ON "classrooms"("joinCode");

-- CreateIndex
CREATE INDEX "_ClassroomToLab_B_index" ON "_ClassroomToLab"("B");

-- AddForeignKey
ALTER TABLE "_ClassroomToLab" ADD CONSTRAINT "_ClassroomToLab_A_fkey" FOREIGN KEY ("A") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassroomToLab" ADD CONSTRAINT "_ClassroomToLab_B_fkey" FOREIGN KEY ("B") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
