"""Add incois_advisories table for INCOIS PFZ text advisory scraping.

Revision ID: 20260814002
Revises: 20260810001
Create Date: 2026-08-14

Safety rules:
- Only CREATE TABLE and CREATE INDEX operations are used.
- No existing tables are dropped, modified, or recreated.
- No existing rows are modified.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# ── Alembic revision metadata ──────────────────────────────────────────────────
revision: str = "20260814002"
down_revision: str | None = "20260810001"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Create the incois_advisories table."""
    op.create_table(
        "incois_advisories",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),

        # Advisory identification
        sa.Column("advisory_date", sa.Date, nullable=False),
        sa.Column("sector_id", sa.String(32), nullable=False),

        # Navigation data from INCOIS text advisory
        sa.Column("landing_center", sa.String(128), nullable=False),
        sa.Column("bearing_degrees", sa.Float, nullable=True),
        sa.Column("distance_km", sa.Float, nullable=True),
        sa.Column("depth_m", sa.Float, nullable=True),

        # Zone coordinates (decimal degrees)
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),

        # Audit trail
        sa.Column("raw_text", sa.Text, nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),

        # Spatial match to nearest canonical KARN_XXX sampling location
        sa.Column(
            "nearest_sampling_location_id",
            sa.Integer,
            sa.ForeignKey(
                "sampling_locations.id",
                name="fk_incois_advisory_sampling_location_id",
            ),
            nullable=True,
        ),
        sa.Column("distance_to_nearest_km", sa.Float, nullable=True),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),

        # Uniqueness: one advisory per date/location coordinate pair
        sa.UniqueConstraint(
            "advisory_date",
            "latitude",
            "longitude",
            name="uq_incois_advisory_date_lat_lon",
        ),
    )

    # Indexes for common query patterns
    op.create_index("ix_incois_advisories_advisory_date", "incois_advisories", ["advisory_date"])
    op.create_index("ix_incois_advisories_sector_id", "incois_advisories", ["sector_id"])
    op.create_index("ix_incois_advisories_latitude", "incois_advisories", ["latitude"])
    op.create_index("ix_incois_advisories_longitude", "incois_advisories", ["longitude"])
    op.create_index(
        "ix_incois_advisories_nearest_sampling_location_id",
        "incois_advisories",
        ["nearest_sampling_location_id"],
    )


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade is not supported for migration 20260814002. "
        "Dropping incois_advisories would destroy scraped advisory data permanently."
    )
