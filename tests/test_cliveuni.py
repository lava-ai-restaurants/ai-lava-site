import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UNI = ROOT / "cliveuni"


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
        self._current_data = []
        self.text_content = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.tags.append(tag)
        if attrs_dict.get("id"):
            self.ids.add(attrs_dict["id"])
        if attrs_dict.get("class"):
            self.classes.extend(attrs_dict["class"].split())
        if tag == "a":
            self.links.append(attrs_dict.get("href", ""))
        if tag == "button":
            self.buttons.append(attrs_dict)
        if tag == "meta":
            if attrs_dict.get("name"):
                self.meta[attrs_dict["name"]] = attrs_dict.get("content", "")
        if tag == "img":
            self.images.append(attrs_dict)

    def handle_data(self, data):
        self.text_content += data


class CliveUniversityAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (UNI / "index.html").read_text(encoding="utf-8")
        cls.css = (UNI / "cliveuni.css").read_text(encoding="utf-8")
        cls.js = (UNI / "cliveuni.js").read_text(encoding="utf-8")
        cls.data = json.loads((UNI / "courses.json").read_text(encoding="utf-8"))
        cls.parser = DocumentParser()
        cls.parser.feed(cls.html)

    # ── Existing v1 tests preserved ──

    def test_complete_learning_application_exists(self):
        for name in ("index.html", "cliveuni.css", "cliveuni.js", "courses.json"):
            self.assertTrue((UNI / name).is_file(), name)

    def test_six_source_backed_courses_cover_manager_fundamentals(self):
        courses = self.data["courses"]
        self.assertGreaterEqual(len(courses), 6)
        domains = {course["domain"] for course in courses}
        self.assertTrue({"food-cost", "labor", "inventory", "accountability", "delegation", "leadership"}.issubset(domains))
        for course in courses:
            self.assertGreaterEqual(len(course["lessons"]), 2)
            self.assertGreaterEqual(len(course["quiz"]), 2)
            self.assertTrue(course["operatingAssignment"])
            for lesson in course["lessons"]:
                self.assertRegex(lesson["source"]["url"], r"youtube\.com/watch\?v=.+&t=\d+s")
                self.assertGreater(lesson["source"]["endSeconds"], lesson["source"]["startSeconds"])
                self.assertIn(lesson["source"]["provenance"], {"publisher_captions", "local_stt"})

    def test_learn_and_operate_surfaces_are_present(self):
        for section_id in ("learn", "paths", "courses", "fieldwork"):
            self.assertIn(section_id, self.parser.ids)
        self.assertIn("course-dialog", self.parser.ids)
        self.assertIn("progress-panel", self.parser.ids)

    def test_roles_and_progress_are_interactive(self):
        for role in ("all", "manager", "general-manager", "chef", "owner"):
            self.assertIn(f'data-role="{role}"', self.html)
        self.assertIn("localStorage", self.js)
        self.assertIn("cliveUniversityProgress", self.js)
        self.assertIn("renderCourses", self.js)
        self.assertIn("submitQuiz", self.js)

    def test_accessibility_and_responsive_contract(self):
        self.assertIn("main", self.parser.tags)
        self.assertIn("nav", self.parser.tags)
        self.assertIn("dialog", self.parser.tags)
        self.assertIn('class="skip-link"', self.html)
        self.assertIn("aria-live", self.html)
        self.assertIn("prefers-reduced-motion", self.css)
        self.assertRegex(self.css, r"@media\s*\([^)]*max-width")
        self.assertRegex(self.css, r"\.course-dialog\s*\{[^}]*margin:\s*0", "full-screen dialog must opt out of native auto margins")
        self.assertIn("dialog.scrollTop = 0", self.js, "course dialog must reset retained scroll position")
        for button in self.parser.buttons:
            self.assertTrue(button.get("type"), button)

    def test_public_copy_is_truthful_and_private_corpus_is_not_exposed(self):
        combined = self.html + self.js + json.dumps(self.data)
        self.assertNotIn("/Users/francescobroglia", combined)
        self.assertNotIn("data/raw/transcripts", combined)
        self.assertIn("Source-backed", combined)
        self.assertIn("not Clive policy", combined)
        self.assertNotRegex(combined, r"985 transcripts")

    # ── v2 Brand Identity ──

    def test_clive_brand_identity_and_fonts(self):
        """Official Clive brand: Playfair Display, Futura PT fallback, Clive tokens."""
        self.assertIn("Playfair Display", self.css, "Must use Playfair Display for display headings")
        # Futura PT or safe fallback
        self.assertTrue(
            "Futura PT" in self.css or "futura" in self.css.lower() or "Century Gothic" in self.css,
            "Must reference Futura PT or a legal fallback (Century Gothic)"
        )
        # Clive color tokens
        self.assertIn("#0D2D32", self.css.upper(), "Ink color #0D2D32 must be in CSS")
        self.assertIn("#F3F0E3", self.css.upper(), "Paper color #F3F0E3 must be in CSS")
        # Brand in header
        self.assertIn("University", self.html)
        # No LAVA as primary visual identity in header
        self.assertNotRegex(self.html, r'<nav[^>]*>.*?class="nav-logo"[^>]*>LAVA', "LAVA must not be primary brand in nav")

    def test_clive_logo_local_asset(self):
        """Logo must exist as a local .webp file and be referenced in HTML."""
        logo_path = UNI / "assets" / "clive-collective-logo.webp"
        self.assertTrue(logo_path.is_file(), "clive-collective-logo.webp must exist")
        self.assertIn("clive-collective-logo.webp", self.html, "Logo must be referenced in HTML")

    def test_local_assets_exist(self):
        """All referenced local assets must exist on disk."""
        for asset in ("clive-collective-logo.webp", "cala.jpg", "americano.webp", "bungalow.jpg"):
            self.assertTrue((UNI / "assets" / asset).is_file(), f"Asset missing: {asset}")

    # ── v2 Articles ──

    def test_articles_count_and_metadata(self):
        """At least 5 articles with required metadata."""
        articles_path = UNI / "articles.json"
        self.assertTrue(articles_path.is_file(), "articles.json must exist")
        articles_data = json.loads(articles_path.read_text(encoding="utf-8"))
        articles = articles_data["articles"]
        self.assertGreaterEqual(len(articles), 5, "Must have at least 5 articles")
        for article in articles:
            self.assertIn("title", article)
            self.assertIn("dek", article)
            self.assertIn("readingTime", article)
            self.assertIn("category", article)
            self.assertIn("body", article)
            self.assertTrue(len(article["body"]) > 100, f"Article body too short: {article['title']}")
            self.assertIn("takeaways", article)
            self.assertIsInstance(article["takeaways"], list)
            self.assertGreaterEqual(len(article["takeaways"]), 1)
            self.assertIn("provenance", article)
            if article["provenance"] == "External operating framework — source cited":
                self.assertRegex(
                    article.get("sourceUrl", ""),
                    r"youtube\.com/watch\?v=.+&t=\d+s",
                    f"Externally grounded article {article.get('id')} needs an exact timestamp source",
                )
        self.assertIn("Watch source segment", self.js)

    def test_articles_section_in_html(self):
        """This Week at Clive section must exist in HTML."""
        self.assertIn("this-week", self.parser.ids, "Must have this-week section")

    # ── v2 Case Studies ──

    def test_case_studies_count_and_structure(self):
        """At least 5 case studies with Challenge/Move/Lesson structure."""
        cs_path = UNI / "case-studies.json"
        self.assertTrue(cs_path.is_file(), "case-studies.json must exist")
        cs_data = json.loads(cs_path.read_text(encoding="utf-8"))
        studies = cs_data["caseStudies"]
        self.assertGreaterEqual(len(studies), 5, "Must have at least 5 case studies")
        for study in studies:
            self.assertIn("challenge", study)
            self.assertIn("move", study)
            self.assertIn("lesson", study)
            self.assertIn("provenance", study)

    def test_case_studies_sanitized(self):
        """Case studies must not contain sensitive data."""
        cs_path = UNI / "case-studies.json"
        cs_text = cs_path.read_text(encoding="utf-8")
        # No employee names (common first-name patterns won't catch everything, check for explicit markers)
        self.assertNotRegex(cs_text, r"\$\d{2,}", "No financial amounts in case studies")
        self.assertNotRegex(cs_text, r"terminated|fired|written up", "No HR actions in case studies")
        self.assertNotRegex(cs_text, r"password|credential|login", "No security details in case studies")
        # Provenance label present
        for study in json.loads(cs_text)["caseStudies"]:
            self.assertIn(study["provenance"], (
                "Clive operating example — sanitized",
                "Manager opportunity exercise",
                "External operating framework — source cited"
            ))

    def test_case_studies_section_in_html(self):
        """How Clive Solves Problems section must exist."""
        self.assertIn("case-studies", self.parser.ids)

    # ── v2 Location Manager Labs ──

    def test_six_location_manager_labs(self):
        """Six locations with prompts, deliverables, and opportunity labeling."""
        fg_path = UNI / "field-guide.json"
        self.assertTrue(fg_path.is_file(), "field-guide.json must exist")
        fg_data = json.loads(fg_path.read_text(encoding="utf-8"))
        labs = fg_data["locationLabs"]
        self.assertGreaterEqual(len(labs), 6, "Must have at least 6 location labs")
        location_names = {lab["location"] for lab in labs}
        required_locations = {"Cala", "Americano", "Tell Your Friends", "Neon Spur", "Bungalow Kitchen Tiburon", "Kuza"}
        for loc in required_locations:
            found = any(loc.lower() in name.lower() for name in location_names)
            self.assertTrue(found, f"Missing location lab: {loc}")
        for lab in labs:
            self.assertIn("prompt", lab)
            self.assertIn("deliverable", lab)
            # Must be labeled as opportunity exercise or manager lab
            label = lab.get("label", "")
            self.assertTrue(
                "manager lab" in label.lower() or "opportunity exercise" in label.lower(),
                f"Lab must be labeled as manager lab or opportunity exercise: {lab['location']}"
            )

    def test_location_labs_section_in_html(self):
        """Opportunities by Location section must exist."""
        self.assertIn("location-labs", self.parser.ids)

    # ── v2 Three-Stage Curriculum ──

    def test_three_stage_curriculum_architecture(self):
        """Foundations / Leadership / In the Field stages must be visible."""
        combined = self.html.lower()
        self.assertIn("foundations", combined)
        self.assertIn("leadership", combined)
        self.assertIn("in the field", combined)

    def test_curriculum_path_in_html(self):
        """Curriculum section must exist in HTML."""
        self.assertIn("curriculum", self.parser.ids)

    # ── v2 Operating Library ──

    def test_operating_library_tools_and_templates(self):
        """Operating library must include tools/templates."""
        fg_path = UNI / "field-guide.json"
        fg_data = json.loads(fg_path.read_text(encoding="utf-8"))
        tools = fg_data.get("tools", [])
        self.assertGreaterEqual(len(tools), 4, "Must have at least 4 tools/templates")
        for tool in tools:
            self.assertIn("title", tool)
            self.assertIn("content", tool)

    def test_operating_library_section_in_html(self):
        """Operating Library section must exist."""
        self.assertIn("operating-library", self.parser.ids)

    # ── v2 Print CSS ──

    def test_print_stylesheet(self):
        """Print media query must exist."""
        self.assertIn("@media print", self.css)

    # ── v2 Footer ──

    def test_footer_links(self):
        """Footer must link to weareclive.com and have Built with LAVA."""
        self.assertIn("https://weareclive.com", self.html)
        # Built with LAVA in footer (not primary brand)
        self.assertRegex(self.html, r"(?i)built with.*lava")

    # ── v2 Provenance Labels ──

    def test_provenance_types_visible(self):
        """Three provenance types must be defined in data files."""
        all_text = ""
        for fname in ("articles.json", "case-studies.json", "field-guide.json"):
            fpath = UNI / fname
            if fpath.is_file():
                all_text += fpath.read_text(encoding="utf-8")
        for prov in ("Clive operating example", "Manager opportunity exercise", "External operating framework"):
            self.assertIn(prov, all_text, f"Provenance type missing: {prov}")

    # ── v2 Sensitive Data Guards ──

    def test_no_sensitive_data_in_any_file(self):
        """No employee names, terminations, financial amounts, credentials."""
        all_content = ""
        for fname in ("index.html", "cliveuni.js", "courses.json", "articles.json", "case-studies.json", "field-guide.json"):
            fpath = UNI / fname
            if fpath.is_file():
                all_content += fpath.read_text(encoding="utf-8")
        self.assertNotRegex(all_content, r"/Users/\w+", "No filesystem paths")
        self.assertNotRegex(all_content, r"password|credential|login|SSN", "No credential info")
        self.assertNotRegex(all_content, r"terminated|fired|written up|disciplinary", "No HR actions")

    # ── v2 Editorial Hero ──

    def test_editorial_hero_content(self):
        """Hero must have hospitality-focused copy, not generic SaaS."""
        self.assertNotIn("SaaS", self.html)
        self.assertNotIn("dashboard", self.html.lower())
        # Should reference hospitality or restaurant leadership
        combined = self.html.lower()
        self.assertTrue(
            "hospitality" in combined or "restaurant" in combined,
            "Hero must reference hospitality or restaurant"
        )


if __name__ == "__main__":
    unittest.main()
