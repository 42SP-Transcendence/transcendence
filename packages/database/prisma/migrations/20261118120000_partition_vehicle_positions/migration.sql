ALTER TABLE "vehicle_positions" RENAME TO "vehicle_positions_unpartitioned";
ALTER TABLE "vehicle_positions_unpartitioned" RENAME CONSTRAINT "vehicle_positions_pkey" TO "vehicle_positions_unpartitioned_pkey";
ALTER TABLE "vehicle_positions_unpartitioned" RENAME CONSTRAINT "vehicle_positions_job_id_fkey" TO "vehicle_positions_unpartitioned_job_id_fkey";
ALTER TABLE "vehicle_positions_unpartitioned" RENAME CONSTRAINT "vehicle_positions_attempt_id_fkey" TO "vehicle_positions_unpartitioned_attempt_id_fkey";
ALTER INDEX "vehicle_positions_attempt_id_idx" RENAME TO "vehicle_positions_unpartitioned_attempt_id_idx";
ALTER INDEX "vehicle_positions_job_id_vehicle_prefix_observed_at_key" RENAME TO "vehicle_positions_unpartitioned_job_id_vehicle_prefix_observed_at_key";
ALTER SEQUENCE "vehicle_positions_id_seq" RENAME TO "vehicle_positions_unpartitioned_id_seq";

CREATE TABLE "vehicle_positions" (
    "id" BIGSERIAL NOT NULL,
    "job_id" UUID NOT NULL,
    "attempt_id" BIGINT NOT NULL,
    "vehicle_prefix" TEXT NOT NULL,
    "observed_at" TIMESTAMPTZ NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "accessible" BOOLEAN NOT NULL,

    CONSTRAINT "vehicle_positions_pkey" PRIMARY KEY ("id", "observed_at")
) PARTITION BY RANGE ("observed_at");

CREATE INDEX "vehicle_positions_attempt_id_idx" ON "vehicle_positions"("attempt_id");

CREATE UNIQUE INDEX "vehicle_positions_job_id_vehicle_prefix_observed_at_key" ON "vehicle_positions"("job_id", "vehicle_prefix", "observed_at");

ALTER TABLE "vehicle_positions" ADD CONSTRAINT "vehicle_positions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "collection_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_positions" ADD CONSTRAINT "vehicle_positions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "collection_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "ensure_vehicle_positions_partition"(day DATE) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    partition_name TEXT := 'vehicle_positions_' || to_char(day, 'YYYYMMDD');
BEGIN
    IF to_regclass(quote_ident(partition_name)) IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext('vehicle_positions_partitions'));
    IF to_regclass(quote_ident(partition_name)) IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF "vehicle_positions" FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        day::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo',
        (day + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
    );
    RETURN TRUE;
END;
$$;

CREATE FUNCTION "drop_vehicle_positions_partitions_before"(day DATE) RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    child TEXT;
    dropped INTEGER := 0;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('vehicle_positions_partitions'));
    FOR child IN
        SELECT c.relname
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        WHERE i.inhparent = '"vehicle_positions"'::REGCLASS
          AND c.relname ~ '^vehicle_positions_[0-9]{8}$'
          AND to_date(substr(c.relname, 19), 'YYYYMMDD') < day
        ORDER BY c.relname
    LOOP
        EXECUTE format('DROP TABLE %I', child);
        dropped := dropped + 1;
    END LOOP;
    RETURN dropped;
END;
$$;

DO $$
DECLARE
    today DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    day DATE;
BEGIN
    FOR day IN
        SELECT DISTINCT (observed_at AT TIME ZONE 'America/Sao_Paulo')::DATE FROM "vehicle_positions_unpartitioned"
        UNION
        SELECT generate_series(today - 1, today + 7, INTERVAL '1 day')::DATE
    LOOP
        PERFORM "ensure_vehicle_positions_partition"(day);
    END LOOP;
END;
$$;

INSERT INTO "vehicle_positions" ("id", "job_id", "attempt_id", "vehicle_prefix", "observed_at", "lat", "lon", "accessible")
SELECT "id", "job_id", "attempt_id", "vehicle_prefix", "observed_at", "lat", "lon", "accessible" FROM "vehicle_positions_unpartitioned";

SELECT setval(
    pg_get_serial_sequence('"vehicle_positions"', 'id'),
    COALESCE((SELECT max("id") FROM "vehicle_positions_unpartitioned"), 1),
    (SELECT count(*) > 0 FROM "vehicle_positions_unpartitioned")
);

DROP TABLE "vehicle_positions_unpartitioned";
