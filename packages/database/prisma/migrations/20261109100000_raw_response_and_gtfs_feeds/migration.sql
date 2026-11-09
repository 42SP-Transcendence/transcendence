-- DropIndex
DROP INDEX "band_assessments_job_id_band_start_secs_method_version_key";

-- AlterTable
ALTER TABLE "collection_attempts" ADD COLUMN     "raw_response" JSONB;

-- AlterTable
ALTER TABLE "band_assessments" ADD COLUMN     "gtfs_feed_id" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "dossiers" ADD COLUMN     "gtfs_feed_id" SMALLINT NOT NULL;

-- CreateTable
CREATE TABLE "gtfs_feeds" (
    "id" SMALLSERIAL NOT NULL,
    "content_hash" TEXT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE NOT NULL,
    "imported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gtfs_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gtfs_feeds_content_hash_key" ON "gtfs_feeds"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "band_assessments_job_id_band_start_secs_method_version_gtfs_key" ON "band_assessments"("job_id", "band_start_secs", "method_version", "gtfs_feed_id");

-- AddForeignKey
ALTER TABLE "band_assessments" ADD CONSTRAINT "band_assessments_gtfs_feed_id_fkey" FOREIGN KEY ("gtfs_feed_id") REFERENCES "gtfs_feeds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_gtfs_feed_id_fkey" FOREIGN KEY ("gtfs_feed_id") REFERENCES "gtfs_feeds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

