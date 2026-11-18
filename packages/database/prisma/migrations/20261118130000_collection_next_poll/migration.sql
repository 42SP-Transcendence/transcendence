-- DropIndex
DROP INDEX "collection_jobs_status_idx";

-- AlterTable
ALTER TABLE "collection_jobs" ADD COLUMN     "next_poll_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "collection_jobs_status_next_poll_at_idx" ON "collection_jobs"("status", "next_poll_at");

