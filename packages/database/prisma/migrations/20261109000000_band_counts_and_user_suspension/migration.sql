-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspended_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "band_assessments" ADD COLUMN     "expected_count" INTEGER,
ADD COLUMN     "observed_count" INTEGER;

