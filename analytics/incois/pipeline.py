"""
INCOIS Advisory Ingestion Pipeline — Phase 1 Orchestrator.

Coordinates the full flow:
    1. Scrape INCOIS TextData page (Playwright headless browser)
    2. Parse HTML → IncoisAdvisoryRecord objects (BeautifulSoup)
    3. Spatial-match each record to the nearest KARN canonical location
    4. Store records in incois_advisories table (skip duplicates)

Phase 2 (future): Cross-reference with GEE environmental data to enrich
INCOIS coordinates with SST and Chlorophyll values for enhanced PFZ scoring.

Usage:
    from sqlalchemy.orm import Session
    from analytics.incois.pipeline import run_incois_pipeline

    with Session(engine) as session:
        result = run_incois_pipeline(session, sector_id="SEC004")
        session.commit()
        print(result)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from analytics.incois.parser import IncoisAdvisoryRecord, parse_advisory_html
from analytics.incois.repository import IncoisAdvisoryRepository
from analytics.incois.scraper import scrape_incois_advisory
from analytics.incois.spatial import SpatialMatchResult, match_all_records

logger = logging.getLogger(__name__)

# Default INCOIS sector for Karnataka coast
DEFAULT_SECTOR_ID = "SEC004"


@dataclass
class IncoisPipelineResult:
    """Summary of a single INCOIS pipeline run."""

    sector_id: str
    advisory_date: date
    run_timestamp: datetime

    # Scraping
    scrape_success: bool = False
    html_length: int = 0

    # Parsing
    records_parsed: int = 0
    no_advisory_today: bool = False

    # Spatial matching
    records_matched: int = 0
    records_unmatched: int = 0

    # Database
    records_inserted: int = 0
    records_skipped: int = 0

    # Errors
    errors: list[str] = field(default_factory=list)

    @property
    def success(self) -> bool:
        return self.scrape_success and len(self.errors) == 0

    def __str__(self) -> str:
        status = "OK" if self.success else "FAILED"
        if self.no_advisory_today:
            return (
                f"[{status}] INCOIS {self.sector_id} @ {self.advisory_date} — "
                f"No advisory issued today."
            )
        return (
            f"[{status}] INCOIS {self.sector_id} @ {self.advisory_date} | "
            f"Parsed: {self.records_parsed} | "
            f"Matched: {self.records_matched} | "
            f"Inserted: {self.records_inserted} | "
            f"Skipped: {self.records_skipped} | "
            f"Errors: {len(self.errors)}"
        )


def run_incois_pipeline(
    session: Session,
    sector_id: str = DEFAULT_SECTOR_ID,
    advisory_date: Optional[date] = None,
    html_override: Optional[str] = None,
) -> IncoisPipelineResult:
    """
    Execute the full INCOIS advisory ingestion pipeline.

    Args:
        session: SQLAlchemy Session. Caller is responsible for commit/rollback.
        sector_id: INCOIS sector identifier (default: "SEC004" = Karnataka).
        advisory_date: Override the advisory date stamp. Defaults to today UTC.
        html_override: Skip scraping and use this HTML string directly.
                       Useful for testing and manual re-processing.

    Returns:
        IncoisPipelineResult summarising the run.
    """
    run_timestamp = datetime.now(timezone.utc)
    if advisory_date is None:
        advisory_date = run_timestamp.date()

    result = IncoisPipelineResult(
        sector_id=sector_id,
        advisory_date=advisory_date,
        run_timestamp=run_timestamp,
    )

    logger.info(
        "=== INCOIS Pipeline START | sector=%s | date=%s ===",
        sector_id,
        advisory_date,
    )

    # ── Step 1: Scrape ────────────────────────────────────────────────────────
    if html_override is not None:
        logger.info("Using provided HTML override (skipping browser scrape).")
        html = html_override
        result.scrape_success = True
    else:
        logger.info("Step 1: Scraping INCOIS page via Playwright …")
        html = scrape_incois_advisory(sector_id=sector_id)
        if html is None:
            result.errors.append("Scraping failed — no HTML returned.")
            logger.error("Pipeline aborted: scraping step failed.")
            return result
        result.scrape_success = True

    result.html_length = len(html)
    logger.info("Step 1 OK — HTML length: %d bytes", result.html_length)

    # ── Step 2: Parse ─────────────────────────────────────────────────────────
    logger.info("Step 2: Parsing advisory HTML …")
    records: list[IncoisAdvisoryRecord] = parse_advisory_html(
        html=html,
        advisory_date=advisory_date,
    )

    if not records:
        result.no_advisory_today = True
        result.records_parsed = 0
        logger.info("Step 2: No advisory records found — no data to store.")
        logger.info("=== INCOIS Pipeline END (no advisory today) ===")
        return result

    result.records_parsed = len(records)
    logger.info("Step 2 OK — Parsed %d advisory record(s).", result.records_parsed)

    # ── Step 3: Spatial matching ───────────────────────────────────────────────
    logger.info("Step 3: Spatial matching to canonical KARN locations …")
    matched_pairs = match_all_records(records)

    matched = [(r, m) for r, m in matched_pairs if m is not None]
    unmatched = [(r, m) for r, m in matched_pairs if m is None]

    result.records_matched = len(matched)
    result.records_unmatched = len(unmatched)

    logger.info(
        "Step 3 OK — Matched: %d | Unmatched: %d",
        result.records_matched,
        result.records_unmatched,
    )
    for record, match_result in unmatched:
        logger.warning(
            "No KARN match for advisory at (%.4f, %.4f) — landing: %s",
            record.latitude,
            record.longitude,
            record.landing_center,
        )

    # ── Step 4: Persist ───────────────────────────────────────────────────────
    logger.info("Step 4: Storing advisory records in database …")
    repo = IncoisAdvisoryRepository(session)

    db_records: list[dict] = []

    for record, match_result in matched_pairs:
        sampling_location_id: Optional[int] = None
        distance_to_nearest: Optional[float] = None

        if match_result is not None:
            # Look up integer PK from location_id string
            sampling_location_id = repo.get_sampling_location_id(match_result.location_id)
            distance_to_nearest = match_result.distance_km

        db_records.append(
            dict(
                advisory_date=record.advisory_date,
                sector_id=sector_id,
                landing_center=record.landing_center,
                bearing_degrees=record.bearing_degrees,
                distance_km=record.distance_km,
                depth_m=record.depth_m,
                latitude=record.latitude,
                longitude=record.longitude,
                raw_text=record.raw_row_text,
                nearest_sampling_location_id=sampling_location_id,
                distance_to_nearest_km=distance_to_nearest,
            )
        )

    inserted, skipped = repo.insert_many(db_records)
    result.records_inserted = inserted
    result.records_skipped = skipped

    logger.info(
        "Step 4 OK — Inserted: %d | Skipped (duplicates): %d",
        inserted,
        skipped,
    )
    logger.info("=== INCOIS Pipeline END | %s ===", result)

    return result
