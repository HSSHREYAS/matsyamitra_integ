"""
INCOIS Marine Fisheries Advisory Scraper — Phase 1

Scrapes Potential Fishing Zone (PFZ) advisory text data from the INCOIS website,
parses structured advisory records (Landing Center, Bearing, Distance, Depth,
Latitude, Longitude), spatially matches them to the 25 canonical Karnataka
sampling points, and stores them in the incois_advisories table.

Phase 2 (future): Cross-reference with GEE environmental observations to
populate SST/Chlorophyll for enriched PFZ scoring.
"""

from importlib import import_module

__all__ = ["pipeline"]


def __getattr__(name: str):
	if name == "pipeline":
		module = import_module(f"{__name__}.pipeline")
		globals()[name] = module
		return module
	raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
