"""Add sampling_locations, pfz_results, risk_results; FK columns on existing tables.

Revision ID: 20260810001
Revises: (none — initial Alembic migration)
Create Date: 2026-08-10

Safety rules enforced:
- Only CREATE TABLE and ADD COLUMN operations are used.
- Existing tables (environmental_observations, marine_observations, analytics_results,
  extraction_runs, dataset_metadata) are never dropped, truncated, or recreated.
- Existing rows are preserved exactly.
- marine_observations.sampling_location_id is backfilled deterministically via exact
  location_id match. All 25 KARN rows are expected to link.
- environmental_observations.sampling_location_id is left NULL. The existing GEE
  observations were generated from random sampling points and cannot be safely mapped
  to canonical KARN locations. Module 4 will populate this column.
"""

from __future__ import annotations

from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

# ── Alembic revision metadata ──────────────────────────────────────────────────
revision: str = "20260810001"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None

# ── Canonical 25 Karnataka sampling locations ──────────────────────────────────
# Source: analytics/data/geometry/sampling_points.geojson
# These identifiers (KARN_001 … KARN_025) are stable and must not be changed.
_CANONICAL_LOCATIONS: list[tuple[str, float, float]] = [
    ("KARN_001", 14.602642, 73.152614),
    ("KARN_002", 13.714424, 74.206417),
    ("KARN_003", 14.252099, 73.284125),
    ("KARN_004", 14.576383, 73.371932),
    ("KARN_005", 12.656436, 74.245355),
    ("KARN_006", 13.876570, 73.098200),
    ("KARN_007", 13.628876, 74.066202),
    ("KARN_008", 13.697208, 74.292278),
    ("KARN_009", 13.841149, 73.600926),
    ("KARN_010", 13.701877, 74.189533),
    ("KARN_011", 13.642529, 74.507275),
    ("KARN_012", 13.819599, 74.118591),
    ("KARN_013", 14.444009, 73.421502),
    ("KARN_014", 12.360216, 73.587784),
    ("KARN_015", 12.904593, 73.898817),
    ("KARN_016", 14.288519, 73.698840),
    ("KARN_017", 14.437228, 73.948746),
    ("KARN_018", 13.343755, 74.666625),
    ("KARN_019", 13.722979, 73.496794),
    ("KARN_020", 14.117504, 73.262162),
    ("KARN_021", 13.762229, 73.216743),
    ("KARN_022", 13.522264, 73.478449),
    ("KARN_023", 12.397850, 73.472452),
    ("KARN_024", 13.763693, 73.448016),
    ("KARN_025", 12.896538, 74.719480),
]


def upgrade() -> None:
    now_iso = datetime.now(timezone.utc).isoformat()

    # ── 1. Create sampling_locations ───────────────────────────────────────────
    op.create_table(
        "sampling_locations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("location_id", sa.String(32), nullable=False),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("location_id", name="uq_sampling_location_location_id"),
    )
    op.create_index(
        "ix_sampling_locations_location_id",
        "sampling_locations",
        ["location_id"],
    )

    # ── 2. Seed the 25 canonical locations ─────────────────────────────────────
    conn = op.get_bind()
    for location_id, latitude, longitude in _CANONICAL_LOCATIONS:
        conn.execute(
            sa.text(
                "INSERT INTO sampling_locations (location_id, latitude, longitude, is_active, created_at, updated_at) "
                "VALUES (:lid, :lat, :lon, true, :now, :now)"
            ),
            {"lid": location_id, "lat": latitude, "lon": longitude, "now": now_iso},
        )

    # ── 3. Add nullable sampling_location_id to environmental_observations ─────
    # Left NULL for all existing rows — GEE random-sample observations cannot be
    # deterministically mapped to canonical KARN locations (Module 4 will do this).
    op.add_column(
        "environmental_observations",
        sa.Column(
            "sampling_location_id",
            sa.Integer,
            sa.ForeignKey("sampling_locations.id", name="fk_eo_sampling_location_id"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_eo_sampling_location_id",
        "environmental_observations",
        ["sampling_location_id"],
    )

    # ── 4. Add nullable sampling_location_id to marine_observations ───────────
    op.add_column(
        "marine_observations",
        sa.Column(
            "sampling_location_id",
            sa.Integer,
            sa.ForeignKey("sampling_locations.id", name="fk_mo_sampling_location_id"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_mo_sampling_location_id",
        "marine_observations",
        ["sampling_location_id"],
    )

    # ── 5. Backfill marine_observations.sampling_location_id ──────────────────
    # Exact match on location_id (e.g. "KARN_001"). All 25 existing rows expected to link.
    conn.execute(
        sa.text(
            "UPDATE marine_observations mo "
            "SET sampling_location_id = sl.id "
            "FROM sampling_locations sl "
            "WHERE mo.location_id = sl.location_id"
        )
    )

    # ── 6. Create pfz_results ──────────────────────────────────────────────────
    op.create_table(
        "pfz_results",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "sampling_location_id",
            sa.Integer,
            sa.ForeignKey("sampling_locations.id", name="fk_pfz_sampling_location_id"),
            nullable=False,
        ),
        sa.Column("observation_date", sa.Date, nullable=False),
        sa.Column(
            "environmental_observation_id",
            sa.Integer,
            sa.ForeignKey(
                "environmental_observations.observation_id",
                name="fk_pfz_environmental_observation_id",
            ),
            nullable=True,
        ),
        sa.Column("source", sa.String(64), nullable=False, server_default=sa.text("'gee'")),
        sa.Column("sst", sa.Float, nullable=True),
        sa.Column("chlorophyll", sa.Float, nullable=True),
        sa.Column("pfz_score", sa.Float, nullable=True),
        sa.Column("pfz_category", sa.String(64), nullable=False),
        sa.Column("confidence_score", sa.Float, nullable=False),
        sa.Column(
            "analytics_version",
            sa.String(64),
            nullable=False,
            server_default=sa.text("'deterministic-v1'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "sampling_location_id",
            "observation_date",
            "analytics_version",
            name="uq_pfz_result_location_date_version",
        ),
    )
    op.create_index("ix_pfz_results_sampling_location_id", "pfz_results", ["sampling_location_id"])
    op.create_index("ix_pfz_results_observation_date", "pfz_results", ["observation_date"])
    op.create_index(
        "ix_pfz_results_environmental_observation_id",
        "pfz_results",
        ["environmental_observation_id"],
    )

    # ── 7. Create risk_results ─────────────────────────────────────────────────
    op.create_table(
        "risk_results",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "sampling_location_id",
            sa.Integer,
            sa.ForeignKey("sampling_locations.id", name="fk_risk_sampling_location_id"),
            nullable=False,
        ),
        sa.Column("observation_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "marine_observation_id",
            sa.Integer,
            sa.ForeignKey(
                "marine_observations.marine_observation_id",
                name="fk_risk_marine_observation_id",
            ),
            nullable=True,
        ),
        sa.Column("source", sa.String(64), nullable=False, server_default=sa.text("'open-meteo'")),
        sa.Column("wind_speed", sa.Float, nullable=True),
        sa.Column("wave_height", sa.Float, nullable=True),
        sa.Column("risk_score", sa.Float, nullable=True),
        sa.Column("risk_category", sa.String(64), nullable=False),
        sa.Column("confidence_score", sa.Float, nullable=False),
        sa.Column(
            "analytics_version",
            sa.String(64),
            nullable=False,
            server_default=sa.text("'deterministic-v1'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "sampling_location_id",
            "observation_timestamp",
            "analytics_version",
            name="uq_risk_result_location_timestamp_version",
        ),
    )
    op.create_index("ix_risk_results_sampling_location_id", "risk_results", ["sampling_location_id"])
    op.create_index("ix_risk_results_observation_timestamp", "risk_results", ["observation_timestamp"])
    op.create_index(
        "ix_risk_results_marine_observation_id",
        "risk_results",
        ["marine_observation_id"],
    )


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade is not supported for migration 20260810001. "
        "Rolling back would drop sampling_locations, pfz_results, and risk_results, "
        "and remove FK columns from existing tables — this risks data loss and is intentionally blocked."
    )
