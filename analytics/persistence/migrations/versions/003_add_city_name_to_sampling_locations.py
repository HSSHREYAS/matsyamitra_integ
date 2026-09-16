"""Add city_name column to sampling_locations and backfill canonical 25 locations.

Revision ID: 20260914003
Revises: 20260814002
Create Date: 2026-09-14

Safety rules enforced:
- Only ADD COLUMN and UPDATE operations are used.
- Existing tables and rows are preserved exactly.
- location_id values are not modified.
- Backfills city_name deterministically for all 25 canonical Karnataka coastal sampling points.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# ── Alembic revision metadata ──────────────────────────────────────────────────
revision: str = "20260914003"
down_revision: str | None = "20260814002"
branch_labels: str | None = None
depends_on: str | None = None

# ── Canonical 25 Karnataka coastal city names mapping ─────────────────────────
_CANONICAL_CITY_NAMES: dict[str, str] = {
    "KARN_001": "Karwar",
    "KARN_002": "Kundapura",
    "KARN_003": "Kumta",
    "KARN_004": "Ankola",
    "KARN_005": "Someshwara",
    "KARN_006": "Bhatkal Deep Sea",
    "KARN_007": "Malpe Offshore",
    "KARN_008": "Maravanthe",
    "KARN_009": "Baindur",
    "KARN_010": "Kundapura Coast",
    "KARN_011": "Gangolli",
    "KARN_012": "Shiroor",
    "KARN_013": "Gokarna",
    "KARN_014": "Mangalore Deep Sea",
    "KARN_015": "Surathkal",
    "KARN_016": "Honnavar",
    "KARN_017": "Belekeri",
    "KARN_018": "Malpe",
    "KARN_019": "Bhatkal Offshore",
    "KARN_020": "Murudeshwar",
    "KARN_021": "Netrani Deep Sea",
    "KARN_022": "Kaup",
    "KARN_023": "Ullal Offshore",
    "KARN_024": "Manki",
    "KARN_025": "Mangalore",
}


def upgrade() -> None:
    """Add city_name column to sampling_locations and backfill canonical city names."""
    # 1. Add nullable city_name column matching SQLAlchemy SamplingLocation model
    op.add_column(
        "sampling_locations",
        sa.Column("city_name", sa.String(128), nullable=True),
    )

    # 2. Backfill city_name for all existing canonical sampling locations
    conn = op.get_bind()
    for location_id, city_name in _CANONICAL_CITY_NAMES.items():
        conn.execute(
            sa.text(
                "UPDATE sampling_locations SET city_name = :city_name WHERE location_id = :location_id"
            ),
            {"city_name": city_name, "location_id": location_id},
        )


def downgrade() -> None:
    """Remove city_name column from sampling_locations."""
    op.drop_column("sampling_locations", "city_name")
