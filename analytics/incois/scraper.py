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
import urllib.parse
import urllib.request
from typing import Any, Optional
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Base URLs used by the INCOIS site
INCOIS_HOME_URL = "https://incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en"
INCOIS_BASE_URL = "https://incois.gov.in/MarineFisheries/TextData?secid={sector_id}"

# How long to wait for HTTP requests (seconds)
_HTTP_TIMEOUT_S: int = 15

# How long to wait for Playwright advisory content to appear (milliseconds)
_PAGE_TIMEOUT_MS: int = 45_000

# Selectors to wait for after the sector page loads
_WAIT_SELECTORS: list[str] = [
    "table",
    "table tr",
    "tbody tr",
    ".no-advisory",
    "#incois-pos-user-bottom",
]

_SECTOR_SELECT_INDEX: int = 1
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def _scrape_via_http_session(sector_id: str = "SEC004") -> Optional[str]:
    """
    Scrapes INCOIS advisories using session-aware HTTP requests.

    INCOIS tracks Java Servlet sessions using jsessionid. By establishing a session
    at TextDataHome and navigating directly to the sector URL embedded with jsessionid,
    the server returns the fully rendered advisory table in 1-2 seconds without
    requiring a headless browser.
    """
    try:
        logger.info("Connecting to INCOIS TextDataHome via session HTTP: %s", INCOIS_HOME_URL)
        cookie_processor = urllib.request.HTTPCookieProcessor()
        opener = urllib.request.build_opener(cookie_processor)

        home_req = urllib.request.Request(
            INCOIS_HOME_URL,
            headers={"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
        )
        with opener.open(home_req, timeout=_HTTP_TIMEOUT_S) as resp:
            home_html = resp.read().decode("utf-8", errors="ignore")

        soup = BeautifulSoup(home_html, "html.parser")
        target_sector_rel_url: Optional[str] = None

        for option in soup.find_all("option"):
            val = option.get("value", "")
            if f"secid={sector_id}" in val:
                target_sector_rel_url = val
                break

        if not target_sector_rel_url:
            # Fallback to standard URL if option wasn't found
            target_sector_rel_url = f"TextData?secid={sector_id}"

        target_url = urllib.parse.urljoin(INCOIS_HOME_URL, target_sector_rel_url)
        logger.info("Fetching INCOIS sector URL: %s", target_url)

        sector_req = urllib.request.Request(
            target_url,
            headers={
                "User-Agent": _USER_AGENT,
                "Accept": "text/html,application/xhtml+xml",
                "Referer": INCOIS_HOME_URL,
            },
        )
        with opener.open(sector_req, timeout=_HTTP_TIMEOUT_S) as resp:
            sector_html = resp.read().decode("utf-8", errors="ignore")

        # Verify whether tables or advisory content are present
        if "<table" in sector_html.lower() or "no-advisory" in sector_html.lower():
            logger.info(
                "Successfully retrieved INCOIS sector=%s via HTTP session (length=%d)",
                sector_id,
                len(sector_html),
            )
            return sector_html

        logger.warning("HTTP session returned HTML without advisory tables (length=%d)", len(sector_html))
        return sector_html

    except Exception as exc:
        logger.warning("HTTP session scrape failed for sector %s: %s", sector_id, exc)
        return None


def _scrape_via_playwright(sector_id: str = "SEC004") -> Optional[str]:
    """Fallback scraping method using headless Chromium via Playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.debug("Playwright not installed, skipping browser fallback.")
        return None

    logger.info("Attempting Playwright fallback for INCOIS sector: %s", sector_id)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            )
            page = browser.new_page(
                user_agent=_USER_AGENT,
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

        return html
    except Exception as exc:
        logger.error("Playwright scrape error (sector=%s): %s", sector_id, exc)
        return None


def scrape_incois_advisory(sector_id: str = "SEC004") -> Optional[str]:
    """
    Retrieve the fully rendered INCOIS advisory HTML for the requested sector.
    Tries the high-performance session-based HTTP fetcher first, then falls back
    to headless Playwright if available.
    """
    html = _scrape_via_http_session(sector_id=sector_id)
    if html is not None and "<table" in html.lower():
        return html

    # Fallback to Playwright
    playwright_html = _scrape_via_playwright(sector_id=sector_id)
    if playwright_html is not None:
        return playwright_html

    return html


def _select_sector(page: Any, sector_id: str, timeout_ms: int) -> bool:
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


def _wait_for_any_selector(page: Any, selectors: list[str], timeout_ms: int) -> None:
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

