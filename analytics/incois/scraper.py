"""
INCOIS Headless Browser Scraper.

Uses Playwright (async) to render the JavaScript-heavy INCOIS Marine Fisheries
TextData page and return the fully rendered HTML for parsing.

The INCOIS TextData endpoint is JavaScript-rendered — the advisory table is
injected into the DOM after page load, so plain requests/urllib will only
retrieve the static shell without any advisory data.

Usage:
    html = scrape_incois_advisory(sector_id="SEC004")
    # Returns rendered HTML string, or None if no advisory / error.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Base URLs used by the INCOIS site
INCOIS_HOME_URL = "https://incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en"
INCOIS_BASE_URL = "https://incois.gov.in/MarineFisheries/TextData?secid={sector_id}"

# How long to wait for the advisory content to appear (milliseconds)
_PAGE_TIMEOUT_MS: int = 45_000

# Selectors to wait for after the sector page loads
_WAIT_SELECTORS: list[str] = [
    "table",
    "table tr",
    "tbody tr",
    ".no-advisory",
    "#incois-pos-user-bottom",
]

# The sector dropdown lives after the language selector on TextDataHome.
_SECTOR_SELECT_INDEX: int = 1


def scrape_incois_advisory(sector_id: str = "SEC004") -> Optional[str]:
    """
    Launch a headless Chromium browser, open the INCOIS PFZ home page, pick
    the requested sector, wait for the sector advisory view to render, and
    return the fully rendered HTML.

    Returns:
        Rendered HTML string if the page loads successfully.
        None if Playwright is unavailable, the page times out, or an error occurs.
    """
    try:
        # Import Playwright lazily so the rest of the package can import
        # without Playwright installed (e.g. during testing with mocks).
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error(
            "Playwright is not installed. "
            "Run: pip install playwright && playwright install chromium"
        )
        return None

    logger.info("Scraping INCOIS advisory home page: %s", INCOIS_HOME_URL)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
            )
            page = browser.new_page(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
            )

            page.goto(INCOIS_HOME_URL, timeout=_PAGE_TIMEOUT_MS, wait_until="networkidle")

            if not _select_sector(page, sector_id, timeout_ms=_PAGE_TIMEOUT_MS):
                browser.close()
                logger.error("Failed to select INCOIS sector: %s", sector_id)
                return None

            _wait_for_any_selector(page, _WAIT_SELECTORS, timeout_ms=_PAGE_TIMEOUT_MS)
            page.wait_for_load_state("networkidle", timeout=_PAGE_TIMEOUT_MS)

            html = page.content()
            browser.close()

        logger.info(
            "Successfully scraped INCOIS sector=%s (html_length=%d)",
            sector_id,
            len(html),
        )
        return html

    except Exception as exc:
        logger.error("Failed to scrape INCOIS advisory (sector=%s): %s", sector_id, exc)
        return None


def _select_sector(page: "Page", sector_id: str, timeout_ms: int) -> bool:
    """Select the requested INCOIS sector from the home-page dropdown."""
    try:
        page.wait_for_selector("select", timeout=timeout_ms, state="attached")
    except Exception:
        logger.error("INCOIS home page did not expose the sector selector.")
        return False

    sector_select = page.locator("select").nth(_SECTOR_SELECT_INDEX)
    options = sector_select.locator("option")

    for index in range(options.count()):
        option = options.nth(index)
        value = option.get_attribute("value") or ""
        if f"secid={sector_id}" not in value:
            continue

        try:
            with page.expect_navigation(wait_until="networkidle", timeout=timeout_ms):
                sector_select.select_option(value=value)
        except Exception:
            try:
                sector_select.select_option(value=value)
                page.wait_for_load_state("networkidle", timeout=timeout_ms)
            except Exception as exc:
                logger.error("INCOIS sector navigation failed: %s", exc)
                return False

        logger.debug("Selected INCOIS sector via value: %s", value)
        return True

    logger.error("No INCOIS sector option matched sector_id=%s", sector_id)
    return False


def _wait_for_any_selector(page: "Page", selectors: list[str], timeout_ms: int) -> None:
    """Wait until at least one of the given CSS selectors appears."""
    per_selector_ms = max(1000, timeout_ms // max(1, len(selectors)))
    for selector in selectors:
        try:
            page.wait_for_selector(selector, timeout=per_selector_ms, state="attached")
            logger.debug("Selector matched: %s", selector)
            return
        except Exception:
            continue

    logger.warning("None of the expected selectors appeared within timeout.")
