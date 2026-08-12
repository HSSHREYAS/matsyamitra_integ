"""
Tests for Module 6 — Current Environmental State Aggregator.

All tests use SQLite in-memory databases for speed and isolation.
PostgreSQL is NOT used in unit tests; it is used only for the live
verification script (live_module6_verification.py).

Tests cover all mandatory scenarios from the Module 6 specification.
"""

import unittest
from datetime import date, datetime, timezone, timedelta

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from analytics.persistence.models import (
    Base,
    PfzResult,
    RiskResult,
    SamplingLocation,
    MarineObservation,
)
from analytics.current_state import (
    FreshnessConfig,
    STATUS_CURRENT,
    STATUS_MISSING,
    STATUS_STALE,
    get_current_environmental_state,
    get_current_environmental_state_for_location,
)

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

TIGHT_CONFIG = FreshnessConfig(pfz_stale_hours=96.0, risk_stale_hours=2.0)

_TS_BASE = datetime(2026, 8, 12, 10, 0, 0, tzinfo=timezone.utc)
_DATE_BASE = date(2026, 8, 10)


def _engine():
    """Return a fresh SQLite in-memory engine with FK support enabled."""
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

    @event.listens_for(eng, "connect")
    def _enable_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(eng)
    return eng


def _seed_locations(session: Session, count: int = 25) -> list[SamplingLocation]:
    locs = []
    for i in range(1, count + 1):
        loc = SamplingLocation(
            location_id=f"KARN_{i:03d}",
            latitude=14.0 + i * 0.01,
            longitude=73.0 + i * 0.01,
            is_active=True,
        )
        session.add(loc)
        locs.append(loc)
    session.flush()
    return locs


def _add_pfz(session: Session, loc: SamplingLocation, obs_date: date = _DATE_BASE) -> PfzResult:
    r = PfzResult(
        sampling_location_id=loc.id,
        observation_date=obs_date,
        source="gee",
        sst=28.5,
        chlorophyll=0.4,
        pfz_score=7.2,
        pfz_category="Favourable",
        confidence_score=88.0,
        analytics_version="deterministic-v1",
    )
    session.add(r)
    session.flush()
    return r


def _add_risk(
    session: Session,
    loc: SamplingLocation,
    obs_ts: datetime = _TS_BASE,
) -> RiskResult:
    r = RiskResult(
        sampling_location_id=loc.id,
        observation_timestamp=obs_ts,
        source="open-meteo",
        wind_speed=6.0,
        wave_height=1.5,
        risk_score=5.5,
        risk_category="Moderate Risk",
        confidence_score=100.0,
        analytics_version="deterministic-v1",
    )
    session.add(r)
    session.flush()
    return r


# ──────────────────────────────────────────────────────────────────────────────
# Test class
# ──────────────────────────────────────────────────────────────────────────────


class CurrentStateTests(unittest.TestCase):

    def setUp(self):
        self.engine = _engine()
        self.session = Session(self.engine)
        self.locs = _seed_locations(self.session)
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    # ------------------------------------------------------------------
    # A. COMPLETE DATA — 25 PFZ + 25 Risk
    # ------------------------------------------------------------------

    def test_a_complete_data_25_pfz_25_risk(self):
        """25 PFZ + 25 Risk → 25 output locations, all populated."""
        for loc in self.locs:
            _add_pfz(self.session, loc)
            _add_risk(self.session, loc)
        self.session.commit()

        states = get_current_environmental_state(self.session)
        self.assertEqual(len(states), 25)
        for s in states:
            self.assertIsNotNone(s.pfz, f"pfz missing for {s.location_id}")
            self.assertIsNotNone(s.risk, f"risk missing for {s.location_id}")
            self.assertEqual(s.pfz.score, 7.2)
            self.assertEqual(s.risk.score, 5.5)

    # ------------------------------------------------------------------
    # B. PFZ WITHOUT RISK
    # ------------------------------------------------------------------

    def test_b_pfz_only_risk_missing(self):
        """25 PFZ, 0 Risk → risk=None, risk status implied MISSING."""
        for loc in self.locs:
            _add_pfz(self.session, loc)
        self.session.commit()

        states = get_current_environmental_state(self.session)
        self.assertEqual(len(states), 25)
        for s in states:
            self.assertIsNotNone(s.pfz)
            self.assertIsNone(s.risk, f"risk should be None for {s.location_id}")

    # ------------------------------------------------------------------
    # C. RISK WITHOUT PFZ
    # ------------------------------------------------------------------

    def test_c_risk_only_pfz_missing(self):
        """0 PFZ, 25 Risk → pfz=None."""
        for loc in self.locs:
            _add_risk(self.session, loc)
        self.session.commit()

        states = get_current_environmental_state(self.session)
        self.assertEqual(len(states), 25)
        for s in states:
            self.assertIsNone(s.pfz, f"pfz should be None for {s.location_id}")
            self.assertIsNotNone(s.risk)

    # ------------------------------------------------------------------
    # D. PARTIAL RISK — 25 PFZ + 23 Risk
    # ------------------------------------------------------------------

    def test_d_partial_risk(self):
        """25 PFZ + 23 Risk → 25 locs, 2 have risk=None (no fabrication)."""
        for loc in self.locs:
            _add_pfz(self.session, loc)
        for loc in self.locs[:23]:
            _add_risk(self.session, loc)
        self.session.commit()

        states = get_current_environmental_state(self.session)
        self.assertEqual(len(states), 25)
        risk_none_count = sum(1 for s in states if s.risk is None)
        self.assertEqual(risk_none_count, 2)
        # Ensure None means None — not zero
        for s in states:
            if s.risk is None:
                pass  # correct
            else:
                self.assertIsNotNone(s.risk.score)

    # ------------------------------------------------------------------
    # E. PARTIAL PFZ — 24 PFZ + 25 Risk
    # ------------------------------------------------------------------

    def test_e_partial_pfz(self):
        """24 PFZ + 25 Risk → 25 locs, 1 has pfz=None."""
        for loc in self.locs[:24]:
            _add_pfz(self.session, loc)
        for loc in self.locs:
            _add_risk(self.session, loc)
        self.session.commit()

        states = get_current_environmental_state(self.session)
        self.assertEqual(len(states), 25)
        pfz_none_count = sum(1 for s in states if s.pfz is None)
        self.assertEqual(pfz_none_count, 1)

    # ------------------------------------------------------------------
    # F. DIFFERENT TIMESTAMPS — PFZ and Risk have different dates
    # ------------------------------------------------------------------

    def test_f_different_timestamps_preserved(self):
        """PFZ and Risk timestamps remain independent — not synchronised."""
        loc = self.locs[0]
        pfz_date = date(2026, 8, 7)
        risk_ts = datetime(2026, 8, 12, 16, 0, 0, tzinfo=timezone.utc)

        _add_pfz(self.session, loc, obs_date=pfz_date)
        _add_risk(self.session, loc, obs_ts=risk_ts)
        self.session.commit()

        state = get_current_environmental_state_for_location(
            self.session, loc.location_id
        )
        self.assertIsNotNone(state)
        self.assertIsNotNone(state.pfz)
        self.assertIsNotNone(state.risk)
        self.assertEqual(state.pfz.observation_date, pfz_date)
        # Risk timestamp must be timezone-aware UTC
        self.assertEqual(
            state.risk.observation_timestamp.replace(tzinfo=timezone.utc),
            risk_ts,
        )
        # They must not equal each other in any meaningful way
        self.assertNotEqual(
            str(state.pfz.observation_date),
            str(state.risk.observation_timestamp.date()),
        )

    # ------------------------------------------------------------------
    # G. LATEST SELECTION — multiple rows, only newest returned
    # ------------------------------------------------------------------

    def test_g_latest_pfz_selected(self):
        """Only the newest PFZ result per location is returned."""
        loc = self.locs[0]
        old_pfz = PfzResult(
            sampling_location_id=loc.id,
            observation_date=date(2026, 8, 1),
            source="gee",
            pfz_score=3.0,
            pfz_category="Unfavourable",
            confidence_score=60.0,
            analytics_version="deterministic-v1",
        )
        new_pfz = PfzResult(
            sampling_location_id=loc.id,
            observation_date=date(2026, 8, 10),
            source="gee",
            pfz_score=8.5,
            pfz_category="Highly Favourable",
            confidence_score=95.0,
            analytics_version="deterministic-v2",  # different version so no unique conflict
        )
        self.session.add_all([old_pfz, new_pfz])
        self.session.commit()

        state = get_current_environmental_state_for_location(
            self.session, loc.location_id
        )
        self.assertEqual(state.pfz.score, 8.5)
        self.assertEqual(state.pfz.observation_date, date(2026, 8, 10))

    def test_g_latest_risk_selected(self):
        """Only the newest Risk result per location is returned."""
        loc = self.locs[0]
        old_risk = RiskResult(
            sampling_location_id=loc.id,
            observation_timestamp=datetime(2026, 8, 12, 10, 0, tzinfo=timezone.utc),
            source="open-meteo",
            risk_score=4.0,
            risk_category="Moderate Risk",
            confidence_score=100.0,
            analytics_version="deterministic-v1",
        )
        new_risk = RiskResult(
            sampling_location_id=loc.id,
            observation_timestamp=datetime(2026, 8, 12, 11, 0, tzinfo=timezone.utc),
            source="open-meteo",
            risk_score=6.5,
            risk_category="High Risk",
            confidence_score=100.0,
            analytics_version="deterministic-v1",
        )
        self.session.add_all([old_risk, new_risk])
        self.session.commit()

        state = get_current_environmental_state_for_location(
            self.session, loc.location_id
        )
        self.assertEqual(state.risk.score, 6.5)
        self.assertEqual(
            state.risk.observation_timestamp.replace(tzinfo=timezone.utc),
            datetime(2026, 8, 12, 11, 0, tzinfo=timezone.utc),
        )

    # ------------------------------------------------------------------
    # H. LOCATION IDENTITY — join via sampling_location_id
    # ------------------------------------------------------------------

    def test_h_location_identity_via_id(self):
        """Results are matched to locations via sampling_location_id, not coords."""
        loc = self.locs[5]  # KARN_006
        _add_pfz(self.session, loc)
        _add_risk(self.session, loc)
        self.session.commit()

        states = get_current_environmental_state(self.session)
        matched = next(s for s in states if s.location_id == loc.location_id)
        self.assertIsNotNone(matched.pfz)
        self.assertIsNotNone(matched.risk)
        # All other locations must have no data
        others = [s for s in states if s.location_id != loc.location_id]
        for s in others:
            self.assertIsNone(s.pfz)
            self.assertIsNone(s.risk)

    # ------------------------------------------------------------------
    # I. FRESHNESS — PFZ and Risk ages calculated independently
    # ------------------------------------------------------------------

    def test_i_independent_freshness(self):
        """PFZ age and Risk age are calculated independently."""
        loc = self.locs[0]
        pfz_date = date(2026, 8, 10)
        risk_ts = datetime(2026, 8, 12, 15, 0, 0, tzinfo=timezone.utc)
        _add_pfz(self.session, loc, obs_date=pfz_date)
        _add_risk(self.session, loc, obs_ts=risk_ts)
        self.session.commit()

        state = get_current_environmental_state_for_location(
            self.session, loc.location_id
        )
        # PFZ age should be ~2 days from midnight Aug 10
        # Risk age should be ~1 hour from Aug 12 15:00 UTC (run near that time)
        # We just assert they are distinct and non-negative
        self.assertGreater(state.pfz.age_hours, 0.0)
        self.assertGreaterEqual(state.risk.age_hours, 0.0)
        # PFZ is from Aug 10, Risk is from Aug 12 — PFZ must be older
        self.assertGreater(state.pfz.age_hours, state.risk.age_hours)

    # ------------------------------------------------------------------
    # J. STATUS — CURRENT / STALE / MISSING
    # ------------------------------------------------------------------

    def test_j_status_current(self):
        """Fresh data produces CURRENT status."""
        loc = self.locs[0]
        now = datetime.now(timezone.utc)
        pfz_date = now.date()  # today → age < 96h threshold
        risk_ts = now - timedelta(hours=0.5)  # 30 min ago → age < 2h threshold

        _add_pfz(self.session, loc, obs_date=pfz_date)
        _add_risk(self.session, loc, obs_ts=risk_ts)
        self.session.commit()

        cfg = FreshnessConfig(pfz_stale_hours=96.0, risk_stale_hours=2.0)
        state = get_current_environmental_state_for_location(
            self.session, loc.location_id, freshness_config=cfg
        )
        self.assertEqual(state.pfz.status, STATUS_CURRENT)
        self.assertEqual(state.risk.status, STATUS_CURRENT)

    def test_j_status_stale(self):
        """Old data produces STALE status."""
        loc = self.locs[0]
        now = datetime.now(timezone.utc)
        pfz_date = (now - timedelta(days=10)).date()   # 10 days old → > 96h
        risk_ts = now - timedelta(hours=5)              # 5h old → > 2h

        _add_pfz(self.session, loc, obs_date=pfz_date)
        _add_risk(self.session, loc, obs_ts=risk_ts)
        self.session.commit()

        cfg = FreshnessConfig(pfz_stale_hours=96.0, risk_stale_hours=2.0)
        state = get_current_environmental_state_for_location(
            self.session, loc.location_id, freshness_config=cfg
        )
        self.assertEqual(state.pfz.status, STATUS_STALE)
        self.assertEqual(state.risk.status, STATUS_STALE)

    def test_j_status_missing(self):
        """Missing results produce None (MISSING implied)."""
        states = get_current_environmental_state(self.session)
        # No data seeded — all 25 locs have both = None
        for s in states:
            self.assertIsNone(s.pfz)
            self.assertIsNone(s.risk)

    # ------------------------------------------------------------------
    # K. ZERO FABRICATION — None stays None, not 0
    # ------------------------------------------------------------------

    def test_k_zero_fabrication_prohibited(self):
        """Missing values must remain None, never 0 or a default value."""
        states = get_current_environmental_state(self.session)
        for s in states:
            self.assertIsNone(s.pfz, f"Expected pfz=None but got {s.pfz} for {s.location_id}")
            self.assertIsNone(s.risk, f"Expected risk=None but got {s.risk} for {s.location_id}")

    # ------------------------------------------------------------------
    # L. ALL CANONICAL LOCATIONS always in output
    # ------------------------------------------------------------------

    def test_l_always_25_output_locations(self):
        """Output always contains exactly 25 records anchored to sampling_locations."""
        # Even with zero results, 25 locations must appear
        states = get_current_environmental_state(self.session)
        self.assertEqual(len(states), 25)
        location_ids = {s.location_id for s in states}
        expected = {f"KARN_{i:03d}" for i in range(1, 26)}
        self.assertEqual(location_ids, expected)

    # ------------------------------------------------------------------
    # M. NO DATA MUTATION — read-only verification
    # ------------------------------------------------------------------

    def test_m_no_data_mutation(self):
        """Aggregation function must be purely read-only."""
        for loc in self.locs:
            _add_pfz(self.session, loc)
            _add_risk(self.session, loc)
        self.session.commit()

        from sqlalchemy import func, select as sa_select
        pfz_count_before = self.session.scalar(sa_select(func.count(PfzResult.id)))
        risk_count_before = self.session.scalar(sa_select(func.count(RiskResult.id)))

        get_current_environmental_state(self.session)

        pfz_count_after = self.session.scalar(sa_select(func.count(PfzResult.id)))
        risk_count_after = self.session.scalar(sa_select(func.count(RiskResult.id)))

        self.assertEqual(pfz_count_before, pfz_count_after)
        self.assertEqual(risk_count_before, risk_count_after)

    # ------------------------------------------------------------------
    # Extra: both missing
    # ------------------------------------------------------------------

    def test_both_missing_all_locations_still_present(self):
        """With no results at all, all 25 locations remain in output with None data."""
        states = get_current_environmental_state(self.session)
        self.assertEqual(len(states), 25)
        for s in states:
            self.assertIsNone(s.pfz)
            self.assertIsNone(s.risk)

    # ------------------------------------------------------------------
    # Extra: get_current_environmental_state_for_location — unknown ID
    # ------------------------------------------------------------------

    def test_unknown_location_id_returns_none(self):
        """Querying a non-existent location returns None gracefully."""
        result = get_current_environmental_state_for_location(self.session, "KARN_999")
        self.assertIsNone(result)

    # ------------------------------------------------------------------
    # Extra: status thresholds do not modify scores or confidence
    # ------------------------------------------------------------------

    def test_freshness_thresholds_do_not_modify_scores(self):
        """Changing thresholds must never change PFZ/Risk scores or confidence."""
        loc = self.locs[0]
        _add_pfz(self.session, loc)
        _add_risk(self.session, loc)
        self.session.commit()

        cfg_tight = FreshnessConfig(pfz_stale_hours=0.001, risk_stale_hours=0.001)
        cfg_wide = FreshnessConfig(pfz_stale_hours=9999.0, risk_stale_hours=9999.0)

        state_tight = get_current_environmental_state_for_location(
            self.session, loc.location_id, freshness_config=cfg_tight
        )
        state_wide = get_current_environmental_state_for_location(
            self.session, loc.location_id, freshness_config=cfg_wide
        )

        # Scores must be identical regardless of threshold
        self.assertEqual(state_tight.pfz.score, state_wide.pfz.score)
        self.assertEqual(state_tight.risk.score, state_wide.risk.score)
        self.assertEqual(state_tight.pfz.confidence, state_wide.pfz.confidence)
        self.assertEqual(state_tight.risk.confidence, state_wide.risk.confidence)

        # But statuses should differ
        self.assertEqual(state_tight.pfz.status, STATUS_STALE)
        self.assertEqual(state_wide.pfz.status, STATUS_CURRENT)

    # ------------------------------------------------------------------
    # Extra: PFZ age uses observation_date (conservative floor)
    # ------------------------------------------------------------------

    def test_pfz_age_uses_observation_date_midnight_utc(self):
        """PFZ age is measured from midnight UTC of observation_date."""
        loc = self.locs[0]
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date()
        _add_pfz(self.session, loc, obs_date=yesterday)
        self.session.commit()

        state = get_current_environmental_state_for_location(
            self.session, loc.location_id
        )
        # Age should be between 24 and 48 hours for yesterday
        self.assertGreaterEqual(state.pfz.age_hours, 24.0)
        self.assertLess(state.pfz.age_hours, 48.0)


if __name__ == "__main__":
    unittest.main()
