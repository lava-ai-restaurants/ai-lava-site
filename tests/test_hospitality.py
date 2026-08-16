"""Acceptance tests for the hospitality-only AI Lava site."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROTECTED_EMPLOYER = bytes.fromhex("436c697665").decode("ascii")


class HospitalityHomepageTests(unittest.TestCase):
    """Homepage must be hospitality/restaurant-only with no generic industry framing."""

    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_homepage_exists(self):
        self.assertTrue((ROOT / "index.html").is_file())

    def test_title_is_hospitality_specific(self):
        self.assertIn("restaurant", self.html.lower())
        self.assertIn("hospitality", self.html.lower())

    def test_no_generic_industry_selector(self):
        for forbidden in [
            "Pick Your Business Type",
            "Pick Your Industry",
            "Home Services",
            "Home services / trades",
            "Real Estate / Construction",
            "Real estate / construction",
            "Professional Services",
            "Professional services",
            "Wellness / Fitness",
            "Wellness / fitness",
            "owner-led companies",
            'data-industry="home"',
            'data-industry="realestate"',
            'data-industry="professional"',
            'data-industry="wellness"',
        ]:
            self.assertNotIn(forbidden, self.html, f"Forbidden phrase found: {forbidden}")

    def test_no_forbidden_homepage_concepts(self):
        lower = self.html.lower()
        for concept in [
            "pick your industry",
            "broader than restaurants",
            "generic business diagnostic",
        ]:
            self.assertNotIn(concept, lower)

    def test_no_fake_live_business_read(self):
        self.assertNotIn("Live Business Read", self.html)
        self.assertNotIn("Bottleneck Risk", self.html)
        self.assertNotIn("cockpit-score", self.html)

    def test_no_fabricated_metrics(self):
        # No "87" bottleneck score or similar fake telemetry
        self.assertNotIn("cockpit-score-row", self.html)
        self.assertNotIn(">87<", self.html)

    def test_primary_cta_is_operator_scan(self):
        self.assertIn("operator-opportunity-scan.html", self.html)
        self.assertIn("Operator Opportunity Scan", self.html)

    def test_assessment_pricing_visible(self):
        self.assertIn("$500", self.html)
        self.assertIn("$2,500", self.html)
        self.assertIn("$1,500", self.html)

    def test_no_roi_calculator(self):
        self.assertNotIn("ROI Calculator", self.html)
        self.assertNotIn("revenueSlider", self.html)

    def test_operator_led_positioning(self):
        self.assertIn("operator-led", self.html.lower())

    def test_footer_is_hospitality(self):
        self.assertIn("restaurant groups", self.html.lower())
        self.assertNotIn(PROTECTED_EMPLOYER, self.html)

    def test_no_protected_employer_references(self):
        self.assertNotIn(PROTECTED_EMPLOYER, self.html)

    def test_credibility_section_uses_generic_titles(self):
        # Testimonials use generic titles, not named businesses
        for encoded_name in (
            "43616c612053636f74747364616c65",
            "54686520416d65726963616e6f",
            "54656c6c20596f757220467269656e6473",
            "4e656f6e2053707572",
        ):
            self.assertNotIn(bytes.fromhex(encoded_name).decode("ascii"), self.html)


class OperatorScanTests(unittest.TestCase):
    """Operator Opportunity Scan must exist, be self-contained, and private."""

    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "operator-opportunity-scan.html").read_text(encoding="utf-8")
        cls.js = (ROOT / "scan-app.js").read_text(encoding="utf-8")
        cls.css = (ROOT / "scan-styles.css").read_text(encoding="utf-8")

    def test_required_files_exist(self):
        for name in ("operator-opportunity-scan.html", "scan-app.js", "scan-styles.css"):
            self.assertTrue((ROOT / name).is_file(), name)

    def test_all_ten_primary_scenarios_are_defined(self):
        keys = re.findall(r"^  (financial|labor|inventory|admin|accountability|guest|sales|systems|strong|other): \{ name:", self.js, re.M)
        self.assertEqual(set(keys), {"financial", "labor", "inventory", "admin", "accountability", "guest", "sales", "systems", "strong", "other"})

    def test_all_eight_modifiers_are_defined(self):
        expected = {"emotional_clarity", "financial_claim", "defensive_culture", "no_sponsor", "immediate_urgency", "wants_surveillance", "wants_automation", "strong_fit"}
        block = self.js.split("const MODIFIERS = {", 1)[1].split("};", 1)[0]
        self.assertEqual(set(re.findall(r"^  ([a-z_]+):", block, re.M)), expected)

    def test_budget_and_branch_constants(self):
        self.assertRegex(self.js, r"const MAX_QUESTIONS = 14;")
        self.assertRegex(self.js, r"const CORE_QUESTION_COUNT = 7;")
        self.assertRegex(self.js, r"const MAX_PRIMARY_BRANCHES = 1;")
        self.assertRegex(self.js, r"const MAX_MODIFIERS = 2;")
        self.assertIn("seq.splice(MAX_QUESTIONS)", self.js)
        self.assertIn("slice(0,Math.min(MAX_MODIFIERS,remaining))", self.js)

    def test_no_network_or_external_dependencies(self):
        combined = self.html + self.js
        for forbidden in ("fetch(", "XMLHttpRequest", "WebSocket", "sendBeacon", "axios"):
            self.assertNotIn(forbidden, combined)
        self.assertNotRegex(self.html, r"<(?:script|link)[^>]+(?:src|href)=[\"']https?://")

    def test_no_upload_or_persistence_controls(self):
        self.assertNotRegex(self.html, r"type=[\"']file[\"']")
        self.assertNotIn("localStorage", self.js)
        self.assertNotIn("sessionStorage", self.js)
        self.assertNotIn("indexedDB", self.js)

    def test_privacy_warning_and_redaction(self):
        for phrase in ("Do not include names", "email redacted", "phone redacted", "secret redacted", "token redacted"):
            self.assertIn(phrase, self.js)
        for sensitive in ("No uploads or credentials", "disappear when the session ends"):
            self.assertIn(sensitive, self.html)

    def test_required_snapshot_blocks(self):
        for phrase in ("What we heard", "Possible constraint", "What is already working", "Opportunity", "Questions worth testing", "Candidate first move", "Next step"):
            self.assertIn(phrase, self.js + self.html)

    def test_safety_and_surveillance_guards(self):
        for phrase in ("Pause the normal commercial flow", "qualified licensed professional", "Track commitments and operating outcomes, not people", "not a fit if individual surveillance"):
            self.assertIn(phrase, self.js)

    def test_accessibility_basics(self):
        self.assertIn('class="skip-link"', self.html)
        self.assertIn('aria-live="polite"', self.html)
        self.assertIn('aria-label="Question navigation"', self.html)
        self.assertIn(':focus-visible', self.css)
        self.assertIn('prefers-reduced-motion:reduce', self.css)
        self.assertIn('"radiogroup"', self.js)
        self.assertIn('aria-checked=', self.js)

    def test_six_fixture_definitions_and_test_label(self):
        block = self.js.split("const TEST_FIXTURES = [", 1)[1].split("];", 1)[0]
        self.assertEqual(len(re.findall(r"\{ name:", block)), 6)
        self.assertIn('get("test")==="1"', self.js)
        self.assertIn("TEST", self.html)

    def test_fixture_panel_hidden_by_default(self):
        self.assertIn('id="fixturePanel"', self.html)
        self.assertRegex(self.html, r'id="fixturePanel"[^>]*hidden')

    def test_back_navigation_and_incompatible_answer_cleanup(self):
        self.assertIn("function back()", self.js)
        self.assertIn("function clearIncompatible()", self.js)
        self.assertIn("clearFrom(state.index)", self.js)
        self.assertIn("delete state.answers[k]", self.js)

    def test_hospitality_framing_in_scan(self):
        self.assertIn("restaurant", self.html.lower())


class DiagnosticRedirectTests(unittest.TestCase):
    """Old restaurant-diagnostic.html must redirect to the new scan."""

    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "restaurant-diagnostic.html").read_text(encoding="utf-8")

    def test_redirect_exists(self):
        self.assertTrue((ROOT / "restaurant-diagnostic.html").is_file())

    def test_meta_refresh_to_scan(self):
        self.assertIn("operator-opportunity-scan.html", self.html)
        self.assertIn('http-equiv="refresh"', self.html)

    def test_no_form_submission(self):
        self.assertNotIn("formsubmit.co", self.html)
        self.assertNotIn("<form", self.html)

    def test_canonical_link(self):
        self.assertIn('rel="canonical"', self.html)
        self.assertIn("operator-opportunity-scan.html", self.html)


class FileExistenceTests(unittest.TestCase):
    """Key files must exist and link correctly."""

    def test_core_files_exist(self):
        for name in ("index.html", "operator-opportunity-scan.html", "scan-app.js",
                      "scan-styles.css", "restaurant-diagnostic.html", "styles.css",
                      "scripts.js"):
            self.assertTrue((ROOT / name).is_file(), f"Missing: {name}")

    def test_service_pages_exist(self):
        for name in ("operations.html", "fb-development.html", "purchasing.html",
                      "accounting.html", "training.html", "reviews.html"):
            self.assertTrue((ROOT / name).is_file(), f"Missing: {name}")

    def test_homepage_links_resolve(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        hrefs = re.findall(r'href="([^"#]+\.html)', html)
        for href in hrefs:
            self.assertTrue((ROOT / href).is_file(), f"Broken link: {href}")

    def test_scan_links_back_to_index(self):
        html = (ROOT / "operator-opportunity-scan.html").read_text(encoding="utf-8")
        self.assertIn('href="index.html"', html)


class ScanBranchConstantsTests(unittest.TestCase):
    """Verify scan branch constants and safety boundaries."""

    @classmethod
    def setUpClass(cls):
        cls.js = (ROOT / "scan-app.js").read_text(encoding="utf-8")

    def test_max_questions_is_14(self):
        self.assertIn("const MAX_QUESTIONS = 14;", self.js)

    def test_core_question_count_is_7(self):
        self.assertIn("const CORE_QUESTION_COUNT = 7;", self.js)

    def test_max_primary_branches_is_1(self):
        self.assertIn("const MAX_PRIMARY_BRANCHES = 1;", self.js)

    def test_max_modifiers_is_2(self):
        self.assertIn("const MAX_MODIFIERS = 2;", self.js)

    def test_splice_enforces_budget(self):
        self.assertIn("seq.splice(MAX_QUESTIONS)", self.js)

    def test_modifier_slice_enforced(self):
        self.assertIn("slice(0,Math.min(MAX_MODIFIERS,remaining))", self.js)

    def test_safety_route_pauses_flow(self):
        self.assertIn('mod_regulated==="yes"', self.js)
        self.assertIn("showSnapshot(true)", self.js)

    def test_surveillance_boundary(self):
        self.assertIn("wants_surveillance", self.js)
        self.assertIn("not a fit if individual surveillance", self.js)

    def test_redact_function_exists(self):
        self.assertIn("function redact(text)", self.js)
        self.assertIn("[email redacted]", self.js)
        self.assertIn("[phone redacted]", self.js)
        self.assertIn("[secret redacted]", self.js)
        self.assertIn("[token redacted]", self.js)

    def test_no_answer_persistence(self):
        self.assertNotIn("localStorage", self.js)
        self.assertNotIn("sessionStorage", self.js)
        self.assertNotIn("indexedDB", self.js)
        self.assertNotIn("cookie", self.js.lower().replace("_cookie", ""))

    def test_no_external_api_calls(self):
        self.assertNotIn("fetch(", self.js)
        self.assertNotIn("XMLHttpRequest", self.js)
        self.assertNotIn("sendBeacon", self.js)


if __name__ == "__main__":
    unittest.main()
