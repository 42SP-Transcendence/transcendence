_This project has been created as part of the 42 curriculum by jucoelho, galves-a, eduribei, vinda-si, dajesus._

# Observatório

## Description

Observatório is a citizen observatory for São Paulo buses. It collects vehicle positions from the SPTrans Olho Vivo API, compares them with the official GTFS schedule, and turns a passenger's wait into a report they can use in a 156 complaint or a public information request (LAI).

Observations, estimates and data gaps are always kept apart: a bus missing from the API is never reported as a trip that did not happen.

## Instructions

### Prerequisites

- Docker with Docker Compose v2
- For local development: Node.js 22 and pnpm 10 (`corepack enable`)

### Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

Open https://localhost:8443. The certificate is self-signed and generated on first start, so the browser asks you to accept it once.

### Local development

```bash
pnpm install
pnpm dev
```

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `pnpm build`     | Builds every app and package with Turborepo  |
| `pnpm lint`      | Runs ESLint in every workspace               |
| `pnpm typecheck` | Type-checks every workspace                  |
| `pnpm test`      | Runs the test suites                         |
| `pnpm format`    | Formats the repository with Prettier         |
| `pnpm knip`      | Lists unused files, exports and dependencies |

### Repository layout

| Path               | Contents                                               |
| ------------------ | ------------------------------------------------------ |
| `apps/web`         | Next.js frontend with server-side rendering            |
| `apps/api`         | NestJS API                                             |
| `apps/collector`   | NestJS worker that collects Olho Vivo data             |
| `packages/core`    | Pure TypeScript domain shared by the api and collector |
| `packages/schemas` | Zod schemas shared by frontend and backend validation  |
| `packages/ui`      | Design system                                          |
| `packages/config`  | Shared TypeScript and ESLint configuration             |
| `infra/nginx`      | Reverse proxy that terminates HTTPS                    |

## Team Information

| Member   | Login      | Roles                                   |
| -------- | ---------- | --------------------------------------- |
| Eduardo  | `eduribei` | Product Owner, Developer                |
| Júlia    | `jucoelho` | Project Manager, Developer              |
| Daniel   | `dajesus`  | Project Manager (to confirm), Developer |
| Gyasmin  | `galves-a` | Technical Lead / Architect, Developer   |
| Vinícius | `vinda-si` | Developer                               |

## Project Management

To be completed: task distribution, meetings, tools and communication channels.

## Technical Stack

| Layer    | Technology                                                   |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 16, React 19, Tailwind CSS 4                         |
| Backend  | NestJS 12                                                    |
| Database | PostgreSQL 17                                                |
| Tooling  | pnpm workspaces, Turborepo, TypeScript 6, ESLint 9, Prettier |
| Runtime  | Docker Compose, nginx (TLS)                                  |

## Database Schema

PostgreSQL 17, managed with Prisma. The source of truth is [`packages/database/prisma/schema.prisma`](packages/database/prisma/schema.prisma) and the migrations next to it. The 20 tables fall into six groups:

| Group         | Tables                                                                                                | Filled by                         |
| ------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------- |
| Accounts      | `users`, `line_follows`                                                                               | Sign-up and line follows          |
| GTFS schedule | `routes`, `calendars`, `trips`, `stops`, `stop_times`, `frequencies`                                  | GTFS import                       |
| Collection    | `line_variants`, `monitoring_requests`, `collection_jobs`, `collection_attempts`, `vehicle_positions` | Collector, from the Olho Vivo API |
| Assessment    | `band_assessments`                                                                                    | Comparison with the schedule      |
| Reports       | `wait_reports`, `dossiers`, `complaint_protocols`                                                     | Passengers                        |
| Open data     | `districts`, `sp156_complaints`, `route_districts`                                                    | SP156 and district imports        |

```mermaid
erDiagram
    users ||--o{ line_follows : follows
    users ||--o{ monitoring_requests : asks
    users ||--o{ wait_reports : reports
    routes ||--o{ trips : has
    calendars ||--o{ trips : runs
    trips ||--o{ stop_times : stops
    stops ||--o{ stop_times : served
    trips ||--o{ frequencies : headways
    routes ||--o{ route_districts : crosses
    districts ||--o{ route_districts : contains
    districts ||--o{ sp156_complaints : receives
    line_variants ||--o{ monitoring_requests : requested
    line_variants ||--o{ collection_jobs : collected
    line_variants ||--o{ wait_reports : waited
    collection_jobs ||--o{ monitoring_requests : serves
    collection_jobs ||--o{ collection_attempts : polls
    collection_jobs ||--o{ vehicle_positions : stores
    collection_attempts ||--o{ vehicle_positions : returns
    collection_jobs ||--o{ band_assessments : assessed
    collection_jobs ||--o{ dossiers : evidence
    wait_reports ||--o| dossiers : becomes
    dossiers ||--o{ complaint_protocols : filed

    users {
        uuid id PK
        text email UK
        text password_hash
        text fortytwo_id UK
        text display_name
        role role
        locale locale
        timestamptz created_at
        timestamptz suspended_at
        timestamptz deleted_at
    }
    line_follows {
        uuid user_id PK, FK
        text route_id PK
        timestamptz created_at
    }
    routes {
        text route_id PK
        text short_name
        text long_name
        smallint route_type
    }
    calendars {
        text service_id PK
        boolean monday
        boolean tuesday
        boolean wednesday
        boolean thursday
        boolean friday
        boolean saturday
        boolean sunday
        date start_date
        date end_date
    }
    trips {
        text trip_id PK
        text route_id FK
        text service_id FK
        smallint direction_id
        text headsign
    }
    stops {
        bigint stop_id PK
        text name
        float lat
        float lon
    }
    stop_times {
        text trip_id PK, FK
        int stop_sequence PK
        bigint stop_id FK
        int arrival_offset_secs
    }
    frequencies {
        text trip_id PK, FK
        int start_secs PK
        int end_secs
        int headway_secs
    }
    line_variants {
        uuid id PK
        text route_id
        smallint direction_id
        int olho_vivo_cl UK
        text lt
        smallint tl
        text terminal_main
        text terminal_secondary
        timestamptz last_seen_at
    }
    monitoring_requests {
        uuid id PK
        uuid user_id FK
        uuid line_variant_id FK
        date operating_day
        uuid collection_job_id FK
        timestamptz created_at
    }
    collection_jobs {
        uuid id PK
        uuid line_variant_id FK
        date operating_day
        job_status status
        int interval_secs
        timestamptz started_at
        timestamptz finished_at
    }
    collection_attempts {
        bigint id PK
        uuid job_id FK
        timestamptz requested_at
        text reference_hr
        collection_outcome outcome
        smallint http_status
        int latency_ms
        int vehicle_count
    }
    vehicle_positions {
        bigint id PK
        uuid job_id FK
        bigint attempt_id FK
        text vehicle_prefix
        timestamptz observed_at
        float lat
        float lon
        boolean accessible
    }
    band_assessments {
        bigint id PK
        uuid job_id FK
        int band_start_secs
        int band_end_secs
        int scheduled_headway_secs
        int max_observed_gap_secs
        int observed_count
        int expected_count
        decimal coverage_ratio
        verdict verdict
        text method_version
    }
    wait_reports {
        uuid id PK
        uuid user_id FK
        uuid line_variant_id FK
        bigint stop_id
        timestamptz started_at
        timestamptz ended_at
        wait_outcome outcome
        timestamptz created_at
    }
    dossiers {
        uuid id PK
        uuid wait_report_id FK, UK
        uuid collection_job_id FK
        text method_version
        jsonb evidence_snapshot
        timestamptz created_at
    }
    complaint_protocols {
        uuid id PK
        uuid dossier_id FK
        protocol_channel channel
        text protocol_number
        date registered_at
        date answered_at
        timestamptz reminder_sent_at
    }
    districts {
        smallint id PK
        text name UK
        text subprefecture
        jsonb geometry
    }
    sp156_complaints {
        bigint id PK
        text source_period
        smallint district_id FK
        complaint_kind kind
        date opened_at
        date closed_at
        text status
        text channel
        float lat
        float lon
    }
    route_districts {
        text route_id PK, FK
        smallint district_id PK, FK
    }
```

`line_follows.route_id`, `line_variants.route_id` and `wait_reports.stop_id` hold GTFS identifiers without a foreign key.

## Features List

To be completed as features are implemented.

## Modules

To be completed with the chosen modules, points and justifications.

## Individual Contributions

To be completed by each team member.

## Resources

- [SPTrans Olho Vivo API](https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/)
- [GTFS Schedule Reference](https://gtfs.org/documentation/schedule/reference/)
- [Next.js documentation](https://nextjs.org/docs)
- [NestJS documentation](https://docs.nestjs.com)
- [Turborepo documentation](https://turborepo.com/docs)

### Use of AI

AI was used to scaffold the monorepo (workspace, tooling, Docker and nginx configuration) and to draft the architecture documentation. Every generated file was reviewed by the team.
