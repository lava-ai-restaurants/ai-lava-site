import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UNI = ROOT / "cliveuni"

REQUIRED_CATEGORIES = {
    "financial-control", "labor", "inventory", "leadership",
    "accountability", "guest-experience", "shift-execution", "concept-operations",
}

MODULE_IDS = [
    "food-cost-101", "labor-101", "inventory-101",
    "accountability-101", "delegation-101", "leadership-101",
    "weekly-variance", "shift-handoff", "labor-scheduling-trap",
    "manager-log-discipline", "ideal-vs-actual", "table-touching",
    "cala-shift-accountability", "cala-reservation-discipline",
    "americano-meatball-method", "americano-tyf-crossover",
    "bungalow-menu-transition", "clive-reporting-integrity",
    "cala-scottsdale", "the-americano", "tell-your-friends",
    "neon-spur", "bungalow-kitchen-tiburon", "kuza",
]

SECTION_PAGES = ["learn", "stories", "field", "library"]


class DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.tags = []
        self.links = []
        self.buttons = []
        self.classes = []
        self.meta = {}
        self.images = []
        self.tag_attrs = []
        self.nav_elements = []
        self._current_nav_links = None
        self.h1_count = 0
        self.text_content = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.tags.append(tag)
        self.tag_attrs.append((tag, attrs_dict))
        if attrs_dict.get("id"):
            self.ids.add(attrs_dict["id"])
        if attrs_dict.get("class"):
            self.classes.extend(attrs_dict["class"].split())
        if tag == "a":
            self.links.append(attrs_dict.get("href", ""))
        if tag == "button":
            self.buttons.append(attrs_dict)
        if tag == "meta" and attrs_dict.get("name"):
            self.meta[attrs_dict["name"]] = attrs_dict.get("content", "")
        if tag == "img":
            self.images.append(attrs_dict)
        if tag == "nav":
            self._current_nav_links = []
            self.nav_elements.append({"attrs": attrs_dict, "links": self._current_nav_links})
        if tag == "h1":
            self.h1_count += 1

    def handle_endtag(self, tag):
        if tag == "nav":
            self._current_nav_links = None

    def handle_data(self, data):
        self.text_content += data


# ═══════════════════════════════════════════════
# MAIN INDEX PAGE
# ═══════════════════════════════════════════════

class CliveUniversityMainPage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (UNI / "index.html").read_text(encoding="utf-8")
        cls.css = (UNI / "cliveuni.css").read_text(encoding="utf-8")
        cls.js = (UNI / "cliveuni.js").read_text(encoding="utf-8")
        cls.parser = DocumentParser()
        cls.parser.feed(cls.html)

    def test_complete_application_exists(self):
        for name in ("index.html", "cliveuni.css", "cliveuni.js", "courses.json"):
            self.assertTrue((UNI / name).is_file(), name)

    def test_clive_brand_identity_and_fonts(self):
        self.assertIn("Playfair Display", self.css)
        self.assertTrue(
            "Futura PT" in self.css or "futura" in self.css.lower() or "Century Gothic" in self.css
        )
        self.assertIn("#0D2D32", self.css.upper())
        self.assertIn("#F3F0E3", self.css.upper())
        self.assertIn("University", self.html)

    def test_clive_logo_local_asset(self):
        logo_path = UNI / "assets" / "clive-collective-logo.webp"
        self.assertTrue(logo_path.is_file())
        self.assertIn("clive-collective-logo.webp", self.html)

    def test_local_assets_exist(self):
        for asset in ("clive-collective-logo.webp", "cala.jpg", "americano.webp", "bungalow.jpg"):
            self.assertTrue((UNI / "assets" / asset).is_file(), f"Asset missing: {asset}")

    def test_accessibility_and_responsive_contract(self):
        self.assertIn("main", self.parser.tags)
        self.assertIn("nav", self.parser.tags)
        self.assertIn('class="skip-link"', self.html)
        self.assertIn("prefers-reduced-motion", self.css)
        self.assertRegex(self.css, r"@media\s*\([^)]*max-width")
        for button in self.parser.buttons:
            self.assertTrue(button.get("type"), button)

    def test_advisory_label_present(self):
        self.assertIn("not Clive policy", self.html)
        self.assertIn("authorized operator", self.html)

    def test_footer_links(self):
        self.assertIn("https://weareclive.com", self.html)
        self.assertRegex(self.html, r"(?i)built with.*lava")

    def test_print_stylesheet(self):
        self.assertIn("@media print", self.css)

    def test_no_sensitive_data_in_main_files(self):
        all_content = self.html + self.js + self.css
        self.assertNotRegex(all_content, r"/Users/\w+")
        self.assertNotRegex(all_content, r"password|credential|login|SSN")
        self.assertNotRegex(all_content, r"terminated|fired|written up|disciplinary")

    def test_safe_area_inset_support(self):
        self.assertIn("safe-area-inset-bottom", self.css)

    def test_mobile_breakpoint_at_760(self):
        self.assertRegex(self.css, r"max-width:\s*76\d+px")


# ═══════════════════════════════════════════════
# MODULE PAGES AND CLOSED-WORLD ARCHITECTURE
# ═══════════════════════════════════════════════

class CliveUniversityClosedWorld(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.topic_dir = UNI / "topic"
        cls.topic_htmls = {}
        for tid in MODULE_IDS:
            p = cls.topic_dir / tid / "index.html"
            if p.is_file():
                cls.topic_htmls[tid] = p.read_text(encoding="utf-8")
        cls.section_htmls = {}
        for sec in SECTION_PAGES:
            p = UNI / sec / "index.html"
            if p.is_file():
                cls.section_htmls[sec] = p.read_text(encoding="utf-8")
        cls.study_js = (UNI / "study-panel.js").read_text(encoding="utf-8")
        cls.study_css = (UNI / "study-panel.css").read_text(encoding="utf-8")

    # ═══ MODULE COUNT AND CATEGORIES ═══

    def test_at_least_24_modules_exist(self):
        existing = [tid for tid in MODULE_IDS if (self.topic_dir / tid / "index.html").is_file()]
        self.assertGreaterEqual(len(existing), 24, f"Only {len(existing)} modules found")

    def test_exactly_8_required_categories(self):
        learn_html = self.section_htmls.get("learn", "")
        for cat_id in REQUIRED_CATEGORIES:
            self.assertIn(
                cat_id, learn_html,
                f"Category page link for {cat_id} not found in learn index",
            )

    def test_all_24_topic_pages_exist(self):
        for tid in MODULE_IDS:
            self.assertTrue(
                (self.topic_dir / tid / "index.html").is_file(),
                f"Missing module page: {tid}",
            )

    def test_topic_ids_are_ascii_slugs(self):
        pattern = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
        for tid in MODULE_IDS:
            self.assertRegex(tid, pattern, f"Invalid slug: {tid}")

    def test_no_topic_id_collisions(self):
        self.assertEqual(len(MODULE_IDS), len(set(MODULE_IDS)))

    # ═══ EVERY MODULE COMPLETE AND CITED ═══

    def test_every_module_has_lessons(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("topic-lesson", html, f"{tid} missing lesson content")

    def test_every_module_has_knowledge_check(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("Knowledge Check", html, f"{tid} missing knowledge check")

    def test_every_module_has_field_assignment(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("Field Assignment", html, f"{tid} missing field assignment")

    def test_every_module_has_category_badge(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("topic-type-badge", html, f"{tid} missing category badge")

    def test_every_module_has_level_badge(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("topic-level-badge", html, f"{tid} missing level badge")

    # ═══ EVERY MODULE HAS ROUTE AND COACH ═══

    def test_every_module_has_coach_panel(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("study-panel", html, f"{tid} missing coach panel")
            self.assertIn("study-fab", html, f"{tid} missing coach FAB")

    def test_every_module_has_embedded_coach_data(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("CLIVEUNI_MODULE", html, f"{tid} missing embedded coach data")

    def test_coach_has_six_modes(self):
        for tid, html in self.topic_htmls.items():
            for mode in ("teach", "quiz", "scenario", "apply", "checklist", "sources"):
                self.assertIn(f'data-mode="{mode}"', html, f"{tid} missing coach mode: {mode}")

    def test_coach_labeled_as_study_coach(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("Clive Study Coach", html, f"{tid} not labeled as Clive Study Coach")

    def test_coach_privacy_notice(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("No answers or progress are saved", html, f"{tid} missing privacy notice")

    # ═══ NO TEXT INPUT IN COACH ═══

    def test_no_text_input_in_coach_html(self):
        for tid, html in self.topic_htmls.items():
            parser = DocumentParser()
            parser.feed(html)
            # Check no input[type=text], textarea, or contenteditable in study panel
            in_study = False
            for tag, attrs in parser.tag_attrs:
                if attrs.get("id") == "study-panel":
                    in_study = True
                if in_study:
                    if tag == "input":
                        self.fail(f"{tid} has <input> in coach panel")
                    if tag == "textarea":
                        self.fail(f"{tid} has <textarea> in coach panel")
                    if attrs.get("contenteditable"):
                        self.fail(f"{tid} has contenteditable in coach panel")

    def test_no_text_input_in_coach_js(self):
        self.assertNotIn("input", self.study_js.lower().split("document.getelementbyid")[0] if "document.getElementById" in self.study_js else "")
        # More comprehensive: no createElement('input') or createElement('textarea')
        self.assertNotIn("createElement('input')", self.study_js)
        self.assertNotIn('createElement("input")', self.study_js)
        self.assertNotIn("createElement('textarea')", self.study_js)
        self.assertNotIn('createElement("textarea")', self.study_js)
        self.assertNotIn("contentEditable", self.study_js)
        self.assertNotIn("contenteditable", self.study_js)

    # ═══ NO NETWORK APIS IN COACH JS ═══

    def test_no_fetch_in_coach_js(self):
        self.assertNotIn("fetch(", self.study_js)
        self.assertNotIn("fetch (", self.study_js)

    def test_no_xhr_in_coach_js(self):
        self.assertNotIn("XMLHttpRequest", self.study_js)
        self.assertNotIn("xmlhttprequest", self.study_js.lower())

    def test_no_websocket_in_coach_js(self):
        self.assertNotIn("WebSocket", self.study_js)
        self.assertNotIn("websocket", self.study_js.lower())

    def test_no_sendbeacon_in_coach_js(self):
        self.assertNotIn("sendBeacon", self.study_js)

    def test_no_dynamic_import_in_coach_js(self):
        self.assertNotIn("import(", self.study_js)

    # ═══ NO PROVIDER/BACKEND FILES ═══

    def test_no_render_yaml(self):
        self.assertFalse((ROOT / "render.yaml").is_file(), "render.yaml must be removed")

    def test_no_api_server(self):
        self.assertFalse((ROOT / "cliveuni-api" / "server.mjs").is_file(), "API server must be removed")

    def test_no_api_directory(self):
        self.assertFalse((ROOT / "cliveuni-api").is_dir(), "cliveuni-api directory must be removed")

    def test_no_provider_references_in_coach_js(self):
        js_lower = self.study_js.lower()
        self.assertNotIn("openai", js_lower)
        self.assertNotIn("anthropic", js_lower)
        self.assertNotIn("api_key", js_lower)
        self.assertNotIn("apikey", js_lower)
        self.assertNotIn("CLIVEUNI_API_URL", self.study_js)
        self.assertNotIn("onrender.com", self.study_js)

    def test_no_provider_references_in_topic_pages(self):
        for tid, html in self.topic_htmls.items():
            self.assertNotIn("CLIVEUNI_API_URL", html, f"{tid} has API URL reference")
            self.assertNotIn("onrender.com", html, f"{tid} has Render reference")
            self.assertNotIn("openai", html.lower(), f"{tid} has OpenAI reference")

    # ═══ NO PERSISTENCE IN COACH ═══

    def test_no_localstorage_in_coach_js(self):
        self.assertNotIn("localStorage", self.study_js)

    def test_no_sessionstorage_in_coach_js(self):
        self.assertNotIn("sessionStorage", self.study_js)

    def test_no_cookies_in_coach_js(self):
        self.assertNotIn("document.cookie", self.study_js)
        self.assertNotIn("cookie", self.study_js.lower())

    # ═══ SAFE DOM RENDERING ═══

    def test_coach_uses_textcontent(self):
        self.assertIn("textContent", self.study_js)

    def test_coach_no_innerhtml(self):
        self.assertNotIn("innerHTML", self.study_js)

    def test_coach_no_eval(self):
        # Check for eval( but not isValidAction which is safe
        lines = self.study_js.split('\n')
        for line in lines:
            stripped = line.strip()
            if 'eval(' in stripped and not stripped.startswith('//'):
                self.fail(f"eval() found in coach JS: {stripped}")

    # ═══ DETERMINISTIC ACTION ALLOWLISTS ═══

    def test_coach_has_allowlist(self):
        self.assertIn("ALLOWED_IDS", self.study_js)

    def test_coach_validates_action_ids(self):
        self.assertIn("isValidAction", self.study_js)

    def test_coach_valid_modes_bounded(self):
        self.assertIn("VALID_MODES", self.study_js)

    # ═══ EVIDENCE BINDING ═══

    def test_evidence_ids_in_module_data(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("evidenceId", html, f"{tid} coach data missing evidenceId binding")

    def test_evidence_blocks_in_page(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("data-evidence-id", html, f"{tid} missing data-evidence-id attributes")

    # ═══ SECTION PAGES ═══

    def test_section_pages_exist(self):
        for sec in SECTION_PAGES:
            self.assertTrue(
                (UNI / sec / "index.html").is_file(),
                f"Missing section page: {sec}",
            )

    def test_section_pages_have_navigation(self):
        for sec, html in self.section_htmls.items():
            for label in ("Today", "Learn", "Stories", "Field", "Library"):
                self.assertIn(label, html, f"{sec} page missing nav label: {label}")

    def test_section_pages_have_breadcrumbs(self):
        for sec, html in self.section_htmls.items():
            self.assertIn("breadcrumb", html.lower(), f"{sec} missing breadcrumbs")

    def test_section_pages_link_to_topics(self):
        self.assertIn("topic/food-cost-101/", self.section_htmls.get("learn", ""))
        self.assertIn("topic/cala-shift-accountability/", self.section_htmls.get("stories", ""))
        self.assertIn("topic/cala-scottsdale/", self.section_htmls.get("field", ""))
        self.assertIn("topic/weekly-variance/", self.section_htmls.get("library", ""))

    # ═══ CATEGORY PAGES ═══

    def test_eight_category_pages_exist(self):
        for cat_id in REQUIRED_CATEGORIES:
            p = UNI / "learn" / cat_id / "index.html"
            self.assertTrue(p.is_file(), f"Missing category page: {cat_id}")

    def test_category_pages_link_to_modules(self):
        for cat_id in REQUIRED_CATEGORIES:
            p = UNI / "learn" / cat_id / "index.html"
            if p.is_file():
                html = p.read_text(encoding="utf-8")
                self.assertIn("topic/", html, f"{cat_id} category page has no module links")

    # ═══ ROUTE / LINK INTEGRITY ═══

    def test_topic_nav_links_resolve(self):
        sample = self.topic_htmls.get("food-cost-101", "")
        self.assertIn('href="../../index.html"', sample)
        self.assertIn('href="../../learn/index.html"', sample)
        self.assertIn('href="../../stories/index.html"', sample)

    def test_section_nav_links_resolve(self):
        sample = self.section_htmls.get("learn", "")
        self.assertIn('href="../index.html"', sample)

    def test_topic_asset_paths_resolve(self):
        sample = self.topic_htmls.get("food-cost-101", "")
        self.assertIn("../../assets/clive-collective-logo.webp", sample)
        self.assertIn("../../cliveuni.css", sample)

    def test_section_asset_paths_resolve(self):
        sample = self.section_htmls.get("learn", "")
        self.assertIn("../assets/clive-collective-logo.webp", sample)
        self.assertIn("../cliveuni.css", sample)

    def test_topic_pages_have_footer(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("not Clive policy", html, f"{tid} missing policy disclaimer")
            self.assertIn("weareclive.com", html, f"{tid} missing footer link")

    def test_topic_pages_have_mobile_nav(self):
        for tid, html in self.topic_htmls.items():
            self.assertIn("bottom-nav", html, f"{tid} missing mobile nav")

    # ═══ FORBIDDEN CONTENT SCAN ═══

    def _collect_all_public_content(self):
        content = ""
        for pattern in ["**/*.html", "**/*.js", "**/*.css", "**/*.json"]:
            for p in UNI.glob(pattern):
                content += p.read_text(encoding="utf-8")
        return content

    def test_no_secret_patterns_in_public(self):
        content = self._collect_all_public_content()
        self.assertNotRegex(content, r"sk-[a-zA-Z0-9]{20,}")
        self.assertNotRegex(content, r"OPENAI_API_KEY\s*=\s*['\"][^'\"]+['\"]")
        self.assertNotRegex(content, r"Bearer\s+[a-zA-Z0-9_-]{20,}")

    def test_no_private_paths_in_public(self):
        content = self._collect_all_public_content()
        self.assertNotRegex(content, r"/Users/\w+")
        self.assertNotRegex(content, r"/home/\w+")

    def test_no_raw_transcript_markers(self):
        content = self._collect_all_public_content()
        self.assertNotRegex(content, r"data/raw/transcripts")
        self.assertNotRegex(content, r"\bgbrain\b", msg="GBrain reference found")
        self.assertNotRegex(content, r"985 transcripts")

    def test_no_employee_data_patterns(self):
        content = self._collect_all_public_content()
        self.assertNotRegex(content, r"terminated|fired|written up|disciplinary")
        # Scan HTML and JSON for employee data patterns (exclude JS URL-validation code)
        html_json_content = ""
        for pattern in ["**/*.html", "**/*.json"]:
            for p in UNI.glob(pattern):
                html_json_content += p.read_text(encoding="utf-8")
        self.assertNotRegex(html_json_content, r"password|credential|login|SSN")

    # ═══ MOBILE / A11Y HOOKS ═══

    def test_study_panel_css_exists(self):
        self.assertTrue((UNI / "study-panel.css").is_file())

    def test_study_panel_js_exists(self):
        self.assertTrue((UNI / "study-panel.js").is_file())

    def test_study_panel_css_mobile_breakpoint(self):
        self.assertRegex(self.study_css, r"max-width:\s*76\d+px")

    def test_study_panel_css_reduced_motion(self):
        self.assertIn("prefers-reduced-motion", self.study_css)

    def test_study_panel_has_accessibility(self):
        sample = self.topic_htmls.get("food-cost-101", "")
        self.assertIn('role="dialog"', sample)
        self.assertIn('aria-modal="true"', sample)
        self.assertIn('aria-labelledby="study-panel-title"', sample)
        self.assertIn('aria-label="Coach conversation"', sample)
        self.assertIn('aria-label="Open Clive Study Coach"', sample)

    # ═══ DATA BUNDLE INTEGRITY ═══

    def test_six_source_backed_courses(self):
        data = json.loads((UNI / "courses.json").read_text(encoding="utf-8"))
        courses = data["courses"]
        self.assertGreaterEqual(len(courses), 6)
        domains = {c["domain"] for c in courses}
        self.assertTrue({"food-cost", "labor", "inventory", "accountability", "delegation", "leadership"}.issubset(domains))
        for course in courses:
            self.assertGreaterEqual(len(course["lessons"]), 2)
            self.assertGreaterEqual(len(course["quiz"]), 2)
            self.assertTrue(course["operatingAssignment"])
            for lesson in course["lessons"]:
                self.assertRegex(lesson["source"]["url"], r"youtube\.com/watch\?v=.+&t=\d+s")

    def test_articles_count_and_metadata(self):
        data = json.loads((UNI / "articles.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(data["articles"]), 5)
        for article in data["articles"]:
            self.assertIn("title", article)
            self.assertIn("body", article)
            self.assertGreaterEqual(len(article["body"]), 100)
            self.assertIn("takeaways", article)

    def test_case_studies_count(self):
        data = json.loads((UNI / "case-studies.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(data["caseStudies"]), 6)
        for cs in data["caseStudies"]:
            self.assertIn("challenge", cs)
            self.assertIn("move", cs)
            self.assertIn("lesson", cs)

    def test_six_location_labs(self):
        data = json.loads((UNI / "field-guide.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(data["locationLabs"]), 6)

    def test_generation_script_exists(self):
        self.assertTrue((ROOT / "scripts" / "generate-topics.mjs").is_file())

    # ═══ PROVENANCE ═══

    def test_provenance_types_visible(self):
        all_text = ""
        for fname in ("articles.json", "case-studies.json", "field-guide.json"):
            fpath = UNI / fname
            if fpath.is_file():
                all_text += fpath.read_text(encoding="utf-8")
        for prov in ("Clive operating example", "Manager opportunity exercise", "External operating framework"):
            self.assertIn(prov, all_text)


if __name__ == "__main__":
    unittest.main()
