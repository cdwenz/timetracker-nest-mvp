-- AlterTable
ALTER TABLE "public"."TimeEntry" ADD COLUMN     "endTimeOfDay" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "recipient" TEXT,
ADD COLUMN     "startTimeOfDay" TEXT,
ADD COLUMN     "taskDescription" TEXT,
ADD COLUMN     "tasks" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "TimeEntry_userId_startDate_idx" ON "public"."TimeEntry"("userId", "startDate");
