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

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append(tag)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if tag == "button":
            self.buttons.append(attrs)


class CliveUniversityAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (UNI / "index.html").read_text(encoding="utf-8")
        cls.css = (UNI / "cliveuni.css").read_text(encoding="utf-8")
        cls.js = (UNI / "cliveuni.js").read_text(encoding="utf-8")
        cls.data = json.loads((UNI / "courses.json").read_text(encoding="utf-8"))
        cls.parser = DocumentParser()
        cls.parser.feed(cls.html)

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
        self.assertRegex(self.css, r"@media\s*\([^)]*max-width:\s*640px")
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


if __name__ == "__main__":
    unittest.main()
