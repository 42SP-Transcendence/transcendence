-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('admin', 'moderator', 'user');

-- CreateEnum
CREATE TYPE "locale" AS ENUM ('pt-BR', 'en', 'es');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('pending', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "collection_outcome" AS ENUM ('ok', 'stale', 'empty', 'auth_failed', 'collector_failed');

-- CreateEnum
CREATE TYPE "verdict" AS ENUM ('compatible', 'attention', 'below', 'not_estimable');

-- CreateEnum
CREATE TYPE "wait_outcome" AS ENUM ('boarded', 'gave_up');

-- CreateEnum
CREATE TYPE "protocol_channel" AS ENUM ('sp156', 'lai');

-- CreateEnum
CREATE TYPE "complaint_kind" AS ENUM ('excessive_interval', 'missed_departure');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "fortytwo_id" TEXT,
    "display_name" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'user',
    "locale" "locale" NOT NULL DEFAULT 'pt-BR',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_follows" (
    "user_id" UUID NOT NULL,
    "route_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_follows_pkey" PRIMARY KEY ("user_id","route_id")
);

-- CreateTable
CREATE TABLE "routes" (
    "route_id" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,
    "route_type" SMALLINT NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("route_id")
);

-- CreateTable
CREATE TABLE "calendars" (
    "service_id" TEXT NOT NULL,
    "monday" BOOLEAN NOT NULL,
    "tuesday" BOOLEAN NOT NULL,
    "wednesday" BOOLEAN NOT NULL,
    "thursday" BOOLEAN NOT NULL,
    "friday" BOOLEAN NOT NULL,
    "saturday" BOOLEAN NOT NULL,
    "sunday" BOOLEAN NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "trips" (
    "trip_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "direction_id" SMALLINT NOT NULL,
    "headsign" TEXT,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("trip_id")
);

-- CreateTable
CREATE TABLE "stops" (
    "stop_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("stop_id")
);

-- CreateTable
CREATE TABLE "stop_times" (
    "trip_id" TEXT NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "stop_id" BIGINT NOT NULL,
    "arrival_offset_secs" INTEGER NOT NULL,

    CONSTRAINT "stop_times_pkey" PRIMARY KEY ("trip_id","stop_sequence")
);

-- CreateTable
CREATE TABLE "frequencies" (
    "trip_id" TEXT NOT NULL,
    "start_secs" INTEGER NOT NULL,
    "end_secs" INTEGER NOT NULL,
    "headway_secs" INTEGER NOT NULL,

    CONSTRAINT "frequencies_pkey" PRIMARY KEY ("trip_id","start_secs")
);

-- CreateTable
CREATE TABLE "line_variants" (
    "id" UUID NOT NULL,
    "route_id" TEXT NOT NULL,
    "direction_id" SMALLINT NOT NULL,
    "olho_vivo_cl" INTEGER NOT NULL,
    "lt" TEXT NOT NULL,
    "tl" SMALLINT NOT NULL,
    "terminal_main" TEXT NOT NULL,
    "terminal_secondary" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ,

    CONSTRAINT "line_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "line_variant_id" UUID NOT NULL,
    "operating_day" DATE NOT NULL,
    "collection_job_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_jobs" (
    "id" UUID NOT NULL,
    "line_variant_id" UUID NOT NULL,
    "operating_day" DATE NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'pending',
    "interval_secs" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "collection_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_attempts" (
    "id" BIGSERIAL NOT NULL,
    "job_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ NOT NULL,
    "reference_hr" TEXT,
    "outcome" "collection_outcome" NOT NULL,
    "http_status" SMALLINT,
    "latency_ms" INTEGER,
    "vehicle_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "collection_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_positions" (
    "id" BIGSERIAL NOT NULL,
    "job_id" UUID NOT NULL,
    "attempt_id" BIGINT NOT NULL,
    "vehicle_prefix" TEXT NOT NULL,
    "observed_at" TIMESTAMPTZ NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "accessible" BOOLEAN NOT NULL,

    CONSTRAINT "vehicle_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "band_assessments" (
    "id" BIGSERIAL NOT NULL,
    "job_id" UUID NOT NULL,
    "band_start_secs" INTEGER NOT NULL,
    "band_end_secs" INTEGER NOT NULL,
    "scheduled_headway_secs" INTEGER,
    "max_observed_gap_secs" INTEGER,
    "coverage_ratio" DECIMAL(4,3) NOT NULL,
    "verdict" "verdict" NOT NULL,
    "method_version" TEXT NOT NULL,

    CONSTRAINT "band_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wait_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "line_variant_id" UUID NOT NULL,
    "stop_id" BIGINT NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ NOT NULL,
    "outcome" "wait_outcome" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wait_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossiers" (
    "id" UUID NOT NULL,
    "wait_report_id" UUID NOT NULL,
    "collection_job_id" UUID NOT NULL,
    "method_version" TEXT NOT NULL,
    "evidence_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_protocols" (
    "id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "channel" "protocol_channel" NOT NULL,
    "protocol_number" TEXT NOT NULL,
    "registered_at" DATE NOT NULL,
    "answered_at" DATE,
    "reminder_sent_at" TIMESTAMPTZ,

    CONSTRAINT "complaint_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" SMALLSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subprefecture" TEXT NOT NULL,
    "geometry" JSONB,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sp156_complaints" (
    "id" BIGSERIAL NOT NULL,
    "source_period" TEXT NOT NULL,
    "district_id" SMALLINT NOT NULL,
    "kind" "complaint_kind" NOT NULL,
    "opened_at" DATE NOT NULL,
    "closed_at" DATE,
    "status" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,

    CONSTRAINT "sp156_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_districts" (
    "route_id" TEXT NOT NULL,
    "district_id" SMALLINT NOT NULL,

    CONSTRAINT "route_districts_pkey" PRIMARY KEY ("route_id","district_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_fortytwo_id_key" ON "users"("fortytwo_id");

-- CreateIndex
CREATE INDEX "trips_route_id_direction_id_idx" ON "trips"("route_id", "direction_id");

-- CreateIndex
CREATE INDEX "stop_times_stop_id_idx" ON "stop_times"("stop_id");

-- CreateIndex
CREATE UNIQUE INDEX "line_variants_olho_vivo_cl_key" ON "line_variants"("olho_vivo_cl");

-- CreateIndex
CREATE UNIQUE INDEX "line_variants_route_id_direction_id_key" ON "line_variants"("route_id", "direction_id");

-- CreateIndex
CREATE INDEX "monitoring_requests_collection_job_id_idx" ON "monitoring_requests"("collection_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_requests_user_id_line_variant_id_operating_day_key" ON "monitoring_requests"("user_id", "line_variant_id", "operating_day");

-- CreateIndex
CREATE INDEX "collection_jobs_status_idx" ON "collection_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "collection_jobs_line_variant_id_operating_day_key" ON "collection_jobs"("line_variant_id", "operating_day");

-- CreateIndex
CREATE INDEX "collection_attempts_job_id_requested_at_idx" ON "collection_attempts"("job_id", "requested_at");

-- CreateIndex
CREATE INDEX "vehicle_positions_attempt_id_idx" ON "vehicle_positions"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_positions_job_id_vehicle_prefix_observed_at_key" ON "vehicle_positions"("job_id", "vehicle_prefix", "observed_at");

-- CreateIndex
CREATE UNIQUE INDEX "band_assessments_job_id_band_start_secs_method_version_key" ON "band_assessments"("job_id", "band_start_secs", "method_version");

-- CreateIndex
CREATE INDEX "wait_reports_user_id_idx" ON "wait_reports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_wait_report_id_key" ON "dossiers"("wait_report_id");

-- CreateIndex
CREATE INDEX "dossiers_collection_job_id_idx" ON "dossiers"("collection_job_id");

-- CreateIndex
CREATE INDEX "complaint_protocols_dossier_id_idx" ON "complaint_protocols"("dossier_id");

-- CreateIndex
CREATE INDEX "complaint_protocols_registered_at_idx" ON "complaint_protocols"("registered_at");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_protocols_channel_protocol_number_key" ON "complaint_protocols"("channel", "protocol_number");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_key" ON "districts"("name");

-- CreateIndex
CREATE INDEX "sp156_complaints_source_period_idx" ON "sp156_complaints"("source_period");

-- CreateIndex
CREATE INDEX "sp156_complaints_district_id_kind_idx" ON "sp156_complaints"("district_id", "kind");

-- CreateIndex
CREATE INDEX "route_districts_district_id_idx" ON "route_districts"("district_id");

-- AddForeignKey
ALTER TABLE "line_follows" ADD CONSTRAINT "line_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("route_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "calendars"("service_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("stop_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencies" ADD CONSTRAINT "frequencies_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_requests" ADD CONSTRAINT "monitoring_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_requests" ADD CONSTRAINT "monitoring_requests_line_variant_id_fkey" FOREIGN KEY ("line_variant_id") REFERENCES "line_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_requests" ADD CONSTRAINT "monitoring_requests_collection_job_id_fkey" FOREIGN KEY ("collection_job_id") REFERENCES "collection_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_jobs" ADD CONSTRAINT "collection_jobs_line_variant_id_fkey" FOREIGN KEY ("line_variant_id") REFERENCES "line_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_attempts" ADD CONSTRAINT "collection_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "collection_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_positions" ADD CONSTRAINT "vehicle_positions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "collection_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_positions" ADD CONSTRAINT "vehicle_positions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "collection_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "band_assessments" ADD CONSTRAINT "band_assessments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "collection_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wait_reports" ADD CONSTRAINT "wait_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wait_reports" ADD CONSTRAINT "wait_reports_line_variant_id_fkey" FOREIGN KEY ("line_variant_id") REFERENCES "line_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_wait_report_id_fkey" FOREIGN KEY ("wait_report_id") REFERENCES "wait_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_collection_job_id_fkey" FOREIGN KEY ("collection_job_id") REFERENCES "collection_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_protocols" ADD CONSTRAINT "complaint_protocols_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sp156_complaints" ADD CONSTRAINT "sp156_complaints_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_districts" ADD CONSTRAINT "route_districts_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("route_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_districts" ADD CONSTRAINT "route_districts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
