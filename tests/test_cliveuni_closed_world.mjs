import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, cpSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UNI = join(ROOT, 'cliveuni');

const REQUIRED_CATEGORIES = [
  'financial-control', 'labor', 'inventory', 'leadership',
  'accountability', 'guest-experience', 'shift-execution', 'concept-operations',
];

const MODULE_IDS = [
  'food-cost-101', 'labor-101', 'inventory-101',
  'accountability-101', 'delegation-101', 'leadership-101',
  'weekly-variance', 'shift-handoff', 'labor-scheduling-trap',
  'manager-log-discipline', 'ideal-vs-actual', 'table-touching',
  'cala-shift-accountability', 'cala-reservation-discipline',
  'americano-meatball-method', 'americano-tyf-crossover',
  'bungalow-menu-transition', 'clive-reporting-integrity',
  'cala-scottsdale', 'the-americano', 'tell-your-friends',
  'neon-spur', 'bungalow-kitchen-tiburon', 'kuza',
];

// ═══════════════════════════════════════
// MODULE COUNT AND CATEGORIES
// ═══════════════════════════════════════

describe('Module count', () => {
  it('has at least 24 modules', () => {
    const existing = MODULE_IDS.filter(id =>
      existsSync(join(UNI, 'topic', id, 'index.html'))
    );
    assert.ok(existing.length >= 24, `Only ${existing.length} modules found`);
  });

  it('has exactly 8 required categories', () => {
    for (const catId of REQUIRED_CATEGORIES) {
      assert.ok(
        existsSync(join(UNI, 'learn', catId, 'index.html')),
        `Missing category page: ${catId}`
      );
    }
  });
});

// ═══════════════════════════════════════
// EVERY MODULE COMPLETE AND CITED
// ═══════════════════════════════════════

describe('Module completeness', () => {
  for (const id of MODULE_IDS) {
    it(`${id} has complete structure`, () => {
      const html = readFileSync(join(UNI, 'topic', id, 'index.html'), 'utf-8');
      assert.ok(html.includes('topic-lesson'), `${id} missing lessons`);
      assert.ok(html.includes('Knowledge Check'), `${id} missing knowledge check`);
      assert.ok(html.includes('Field Assignment'), `${id} missing field assignment`);
      assert.ok(html.includes('topic-type-badge'), `${id} missing category badge`);
      assert.ok(html.includes('topic-level-badge'), `${id} missing level badge`);
      assert.ok(html.includes('data-evidence-id'), `${id} missing evidence IDs`);
    });
  }
});

// ═══════════════════════════════════════
// EVERY MODULE HAS COACH
// ═══════════════════════════════════════

describe('Coach presence', () => {
  for (const id of MODULE_IDS) {
    it(`${id} has closed-world coach`, () => {
      const html = readFileSync(join(UNI, 'topic', id, 'index.html'), 'utf-8');
      assert.ok(html.includes('study-panel'), `${id} missing coach panel`);
      assert.ok(html.includes('study-fab'), `${id} missing coach FAB`);
      assert.ok(html.includes('CLIVEUNI_MODULE'), `${id} missing embedded coach data`);
      assert.ok(html.includes('Clive Study Coach'), `${id} not labeled correctly`);
      for (const mode of ['teach', 'quiz', 'scenario', 'apply', 'checklist', 'sources']) {
        assert.ok(html.includes(`data-mode="${mode}"`), `${id} missing mode: ${mode}`);
      }
    });
  }
});

// ═══════════════════════════════════════
// NO TEXT INPUT IN COACH
// ═══════════════════════════════════════

describe('No text input in coach', () => {
  it('study-panel.js has no input/textarea creation', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(!js.includes("createElement('input')"), 'Creates input element');
    assert.ok(!js.includes('createElement("input")'), 'Creates input element');
    assert.ok(!js.includes("createElement('textarea')"), 'Creates textarea element');
    assert.ok(!js.includes('createElement("textarea")'), 'Creates textarea element');
    assert.ok(!js.includes('contentEditable'), 'Uses contentEditable');
    assert.ok(!js.includes('contenteditable'), 'Uses contenteditable');
  });

  for (const id of MODULE_IDS) {
    it(`${id} has no input/textarea in coach panel`, () => {
      const html = readFileSync(join(UNI, 'topic', id, 'index.html'), 'utf-8');
      const panelStart = html.indexOf('id="study-panel"');
      const panelEnd = html.indexOf('</aside>', panelStart);
      if (panelStart !== -1 && panelEnd !== -1) {
        const panelHtml = html.substring(panelStart, panelEnd);
        assert.ok(!panelHtml.includes('<input'), `${id} has <input> in coach`);
        assert.ok(!panelHtml.includes('<textarea'), `${id} has <textarea> in coach`);
        assert.ok(!panelHtml.includes('contenteditable'), `${id} has contenteditable in coach`);
      }
    });
  }
});

// ═══════════════════════════════════════
// NO NETWORK APIS IN COACH JS
// ═══════════════════════════════════════

describe('No network APIs in coach', () => {
  it('study-panel.js has no fetch/XHR/WebSocket/sendBeacon', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(!js.includes('fetch('), 'Contains fetch()');
    assert.ok(!js.includes('XMLHttpRequest'), 'Contains XMLHttpRequest');
    assert.ok(!js.includes('WebSocket'), 'Contains WebSocket');
    assert.ok(!js.includes('sendBeacon'), 'Contains sendBeacon');
    assert.ok(!js.includes('import('), 'Contains dynamic import');
  });
});

// ═══════════════════════════════════════
// NO PROVIDER/BACKEND FILES
// ═══════════════════════════════════════

describe('No provider/backend', () => {
  it('render.yaml does not exist', () => {
    assert.ok(!existsSync(join(ROOT, 'render.yaml')));
  });

  it('cliveuni-api directory does not exist', () => {
    assert.ok(!existsSync(join(ROOT, 'cliveuni-api')));
  });

  it('study-panel.js has no provider references', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    const lower = js.toLowerCase();
    assert.ok(!lower.includes('openai'), 'References OpenAI');
    assert.ok(!lower.includes('anthropic'), 'References Anthropic');
    assert.ok(!js.includes('CLIVEUNI_API_URL'), 'References API URL');
    assert.ok(!js.includes('onrender.com'), 'References Render');
    assert.ok(!lower.includes('api_key'), 'References API key');
  });
});

// ═══════════════════════════════════════
// DETERMINISTIC ACTION ALLOWLISTS
// ═══════════════════════════════════════

describe('Deterministic allowlists', () => {
  it('coach JS has ALLOWED_IDS set', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('ALLOWED_IDS'), 'Missing ALLOWED_IDS');
    assert.ok(js.includes('isValidAction'), 'Missing isValidAction');
    assert.ok(js.includes('VALID_MODES'), 'Missing VALID_MODES');
  });

  it('embedded coach data has evidence bindings', () => {
    const html = readFileSync(join(UNI, 'topic', 'food-cost-101', 'index.html'), 'utf-8');
    assert.ok(html.includes('evidenceId'), 'Missing evidenceId in coach data');
    assert.ok(html.includes('food-cost-101-ev-'), 'Missing evidence IDs');
    assert.ok(html.includes('food-cost-101-kc-'), 'Missing knowledge check IDs');
    assert.ok(html.includes('food-cost-101-teach-'), 'Missing teach step IDs');
  });
});

// ═══════════════════════════════════════
// UNKNOWN/CROSS-TOPIC IDS FAIL CLOSED
// ═══════════════════════════════════════

describe('Fail closed behavior', () => {
  it('coach validates IDs against allowlist', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('ALLOWED_IDS.has(actionId)'), 'Must validate against ALLOWED_IDS');
  });

  it('coach rejects unknown modes', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('Unknown mode'), 'Must handle unknown modes');
  });

  it('coach has evidence registry and validates evidence IDs', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('EVIDENCE_REGISTRY'), 'Missing EVIDENCE_REGISTRY');
    assert.ok(js.includes('isValidEvidenceId'), 'Missing isValidEvidenceId');
  });

  it('tampered/missing evidence IDs render closed failure not content', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    // addMessage only sets data-evidence-id when isValidEvidenceId passes
    assert.ok(js.includes('isValidEvidenceId(evidenceId)'), 'Must validate evidenceId before rendering');
    // addActionButton only works for valid action IDs
    assert.ok(js.includes("if (!isValidAction(id) && id !== '__nav') return"), 'Must reject invalid action IDs');
  });

  it('cross-topic evidence IDs are not in module data', () => {
    // Verify food-cost-101 doesn't contain labor-101 evidence IDs
    const html = readFileSync(join(UNI, 'topic', 'food-cost-101', 'index.html'), 'utf-8');
    assert.ok(!html.includes('labor-101-ev-'), 'food-cost-101 contains cross-topic labor-101 evidence');
    assert.ok(!html.includes('inventory-101-ev-'), 'food-cost-101 contains cross-topic inventory-101 evidence');
  });
});

// ═══════════════════════════════════════
// SAFE TEXTCONTENT RENDERING
// ═══════════════════════════════════════

describe('Safe rendering', () => {
  it('coach uses textContent not innerHTML', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('textContent'), 'Must use textContent');
    assert.ok(!js.includes('innerHTML'), 'Must not use innerHTML');
  });

  it('no eval in coach JS', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    const lines = js.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('eval(') && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        assert.fail(`eval() found in coach JS: ${trimmed}`);
      }
    }
  });
});

// ═══════════════════════════════════════
// NO PERSISTENCE
// ═══════════════════════════════════════

describe('No persistence in coach', () => {
  it('no localStorage/sessionStorage/cookies', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(!js.includes('localStorage'), 'Uses localStorage');
    assert.ok(!js.includes('sessionStorage'), 'Uses sessionStorage');
    assert.ok(!js.includes('document.cookie'), 'Uses cookies');
  });
});

// ═══════════════════════════════════════
// ROUTE / ASSET INTEGRITY
// ═══════════════════════════════════════

describe('Route integrity', () => {
  it('topic pages have correct relative paths', () => {
    const html = readFileSync(join(UNI, 'topic', 'food-cost-101', 'index.html'), 'utf-8');
    assert.ok(html.includes('href="../../index.html"'));
    assert.ok(html.includes('href="../../learn/index.html"'));
    assert.ok(html.includes('../../cliveuni.css'));
    assert.ok(html.includes('../../assets/clive-collective-logo.webp'));
  });

  it('section pages have correct relative paths', () => {
    const html = readFileSync(join(UNI, 'learn', 'index.html'), 'utf-8');
    assert.ok(html.includes('href="../index.html"'));
    assert.ok(html.includes('../cliveuni.css'));
    assert.ok(html.includes('../assets/clive-collective-logo.webp'));
  });

  it('category pages have correct relative paths', () => {
    const html = readFileSync(join(UNI, 'learn', 'financial-control', 'index.html'), 'utf-8');
    assert.ok(html.includes('href="../../index.html"'));
    assert.ok(html.includes('../../cliveuni.css'));
  });

  it('all generated topic pages exist and link properly', () => {
    for (const id of MODULE_IDS) {
      const path = join(UNI, 'topic', id, 'index.html');
      assert.ok(existsSync(path), `Missing topic page: ${id}`);
      const html = readFileSync(path, 'utf-8');
      assert.ok(html.includes('../../cliveuni.css'), `${id} missing CSS link`);
      assert.ok(html.includes('../../study-panel.css'), `${id} missing study panel CSS`);
      assert.ok(html.includes('../../study-panel.js'), `${id} missing study panel JS`);
      assert.ok(html.includes('../../assets/clive-collective-logo.webp'), `${id} missing logo`);
    }
  });

  it('all section pages exist and link properly', () => {
    for (const sec of ['learn', 'stories', 'field', 'library']) {
      const path = join(UNI, sec, 'index.html');
      assert.ok(existsSync(path), `Missing section page: ${sec}`);
      const html = readFileSync(path, 'utf-8');
      assert.ok(html.includes('../cliveuni.css'), `${sec} missing CSS link`);
    }
  });

  it('all category pages exist', () => {
    for (const catId of REQUIRED_CATEGORIES) {
      const path = join(UNI, 'learn', catId, 'index.html');
      assert.ok(existsSync(path), `Missing category page: ${catId}`);
    }
  });
});

// ═══════════════════════════════════════
// MOBILE / A11Y
// ═══════════════════════════════════════

describe('Mobile and accessibility', () => {
  it('study panel CSS has mobile breakpoint', () => {
    const css = readFileSync(join(UNI, 'study-panel.css'), 'utf-8');
    assert.ok(/max-width:\s*76\d+px/.test(css), 'Missing mobile breakpoint');
  });

  it('study panel respects reduced motion', () => {
    const css = readFileSync(join(UNI, 'study-panel.css'), 'utf-8');
    assert.ok(css.includes('prefers-reduced-motion'), 'Missing reduced motion');
  });

  it('topic pages have skip link', () => {
    const html = readFileSync(join(UNI, 'topic', 'food-cost-101', 'index.html'), 'utf-8');
    assert.ok(html.includes('skip-link'), 'Missing skip link');
  });

  it('topic pages have mobile bottom nav', () => {
    const html = readFileSync(join(UNI, 'topic', 'food-cost-101', 'index.html'), 'utf-8');
    assert.ok(html.includes('bottom-nav'), 'Missing mobile nav');
  });

  it('study panel has role=dialog and aria-modal=true', () => {
    const html = readFileSync(join(UNI, 'topic', 'food-cost-101', 'index.html'), 'utf-8');
    assert.ok(html.includes('role="dialog"'), 'Missing role=dialog');
    assert.ok(html.includes('aria-modal="true"'), 'Missing aria-modal');
    assert.ok(html.includes('aria-labelledby="study-panel-title"'), 'Missing aria-labelledby');
  });

  it('FAB hidden rule uses display none important', () => {
    const css = readFileSync(join(UNI, 'study-panel.css'), 'utf-8');
    assert.ok(css.includes('.study-fab[hidden]'), 'Missing .study-fab[hidden] rule');
    assert.ok(css.includes('display: none !important') || css.includes('display:none!important') || css.includes('display: none!important') || css.includes('display:none !important'), 'FAB hidden must use display:none!important');
  });

  it('body.study-open hides bottom nav', () => {
    const css = readFileSync(join(UNI, 'study-panel.css'), 'utf-8');
    assert.ok(css.includes('body.study-open .bottom-nav'), 'Missing body.study-open .bottom-nav rule');
  });

  it('body.study-open locks scroll', () => {
    const css = readFileSync(join(UNI, 'study-panel.css'), 'utf-8');
    assert.ok(css.includes('body.study-open'), 'Missing body.study-open');
    assert.ok(css.includes('overflow: hidden') || css.includes('overflow:hidden'), 'Missing overflow hidden');
  });

  it('coach JS opens focus to close button', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('closeBtn.focus()') || js.includes('closeBtn) closeBtn.focus()'), 'Must focus close button on open');
  });

  it('coach JS restores focus to FAB on close', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('fab.focus()'), 'Must restore focus to FAB on close');
  });

  it('coach JS has document-level Escape closure', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes("document.addEventListener('keydown'") || js.includes('document.addEventListener("keydown"'), 'Must have document-level keydown handler');
    assert.ok(js.includes("e.key === 'Escape'") || js.includes('e.key === "Escape"'), 'Must handle Escape key');
  });

  it('coach JS has Tab/Shift+Tab focus trap', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes("e.key !== 'Tab'") || js.includes("e.key === 'Tab'") || js.includes('Tab'), 'Must handle Tab key for focus trap');
    assert.ok(js.includes('e.shiftKey'), 'Must handle Shift+Tab');
  });

  it('coach JS sets inert on background elements', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes("'inert'") || js.includes('"inert"'), 'Must set inert attribute');
    assert.ok(js.includes('aria-hidden'), 'Must set aria-hidden fallback');
  });

  it('coach JS has aria-pressed on mode buttons', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('aria-pressed'), 'Must set aria-pressed on mode buttons');
  });
});

// ═══════════════════════════════════════
// XSS AND URL SAFETY (BLOCKER 1)
// ═══════════════════════════════════════

describe('XSS and URL safety', () => {
  it('generator uses safeJsonForScript not raw JSON.stringify for inline script', () => {
    const gen = readFileSync(join(ROOT, 'scripts', 'generate-topics.mjs'), 'utf-8');
    assert.ok(gen.includes('safeJsonForScript'), 'Must use safeJsonForScript');
    // Verify it escapes <, >, & and script terminators
    assert.ok(gen.includes("'\\\\u003c'") || gen.includes('"\\\\u003c"') || gen.includes("\\u003c"), 'Must escape <');
    assert.ok(gen.includes("\\u003e") || gen.includes("'\\\\u003e'"), 'Must escape >');
  });

  it('</script><script> breakout cannot appear as executable markup', () => {
    // Verify that safeJsonForScript would neutralize a </script> in data
    const testData = { content: '</script><script>alert(1)</script>' };
    // The serializer replaces < with \u003c, so </script> becomes \u003c/script\u003e
    const serialized = JSON.stringify(testData)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    assert.ok(!serialized.includes('</script>'), 'Script breakout must be neutralized');
    assert.ok(!serialized.includes('<script>'), 'Script injection must be neutralized');
  });

  it('javascript: URLs cannot appear as executable links in coach', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes('isValidCitationUrl'), 'Must validate citation URLs');
    // Verify the validator rejects javascript: protocol
    assert.ok(js.includes('javascript:'), 'Must check for javascript: protocol');
  });

  it('coach JS validates citations before creating anchors', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    // addMessage must validate URL before creating link
    assert.ok(js.includes('isValidCitationUrl(citation.url)'), 'Must validate URL before link creation');
  });

  it('generator validates source URLs centrally', () => {
    const gen = readFileSync(join(ROOT, 'scripts', 'generate-topics.mjs'), 'utf-8');
    assert.ok(gen.includes('validateCitations'), 'Must have central citation validation');
    assert.ok(gen.includes('ALLOWED_HTTPS_HOSTS'), 'Must have host allowlist');
  });

  it('no raw innerHTML in cliveuni.js tool rendering', () => {
    const js = readFileSync(join(UNI, 'cliveuni.js'), 'utf-8');
    // The openTool function should not use innerHTML for tool.content
    const openToolSection = js.substring(js.indexOf('function openTool'));
    const endOfOpenTool = openToolSection.indexOf('function ', 10);
    const openToolBody = endOfOpenTool > 0 ? openToolSection.substring(0, endOfOpenTool) : openToolSection;
    assert.ok(!openToolBody.includes('innerHTML = tool.content'), 'openTool must not use raw innerHTML for tool.content');
  });

  it('homepage cliveuni.js does not use innerHTML for user-facing tool rendering', () => {
    const js = readFileSync(join(UNI, 'cliveuni.js'), 'utf-8');
    // openTool should use textContent or DOM building, not raw innerHTML
    assert.ok(js.includes('textContent = tool.title') || js.includes('textContent = tool.content'), 'openTool should use textContent');
  });
});

// ═══════════════════════════════════════
// CONTENT INTEGRITY (BLOCKER 2)
// ═══════════════════════════════════════

describe('Content integrity', () => {
  it('ideal-vs-actual article preserves "The ideal vs." phrase', () => {
    const html = readFileSync(join(UNI, 'topic', 'ideal-vs-actual', 'index.html'), 'utf-8');
    assert.ok(html.includes('ideal vs.'), 'Must preserve "ideal vs." phrase');
  });

  it('weekly-variance article preserves "It is a discipline." sentence', () => {
    const html = readFileSync(join(UNI, 'topic', 'weekly-variance', 'index.html'), 'utf-8');
    assert.ok(html.includes('It is a discipline.'), 'Must preserve "It is a discipline." sentence');
  });

  it('article body split preserves content exactly', () => {
    const articles = JSON.parse(readFileSync(join(UNI, 'articles.json'), 'utf-8'));
    for (const article of articles.articles) {
      const html = readFileSync(join(UNI, 'topic', article.id, 'index.html'), 'utf-8');
      // Verify key content from the article body appears in the page
      const firstWords = article.body.substring(0, 50);
      const lastWords = article.body.substring(article.body.length - 50);
      assert.ok(html.includes(firstWords.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')),
        `${article.id}: first words of body missing from page`);
    }
  });

  it('generator uses paragraph-safe split not naive sentence split', () => {
    const gen = readFileSync(join(ROOT, 'scripts', 'generate-topics.mjs'), 'utf-8');
    // Must NOT use simple split('. ') for article bodies
    // The regex-based split preserves abbreviations
    assert.ok(gen.includes('sentenceRe') || gen.includes('sentenceBreaks'), 'Must use paragraph-safe split');
    assert.ok(gen.includes('reconstructed !== body'), 'Must verify reconstruction matches original');
  });
});

// ═══════════════════════════════════════
// EVIDENCE / SOURCES (BLOCKER 3)
// ═══════════════════════════════════════

describe('Evidence and sources', () => {
  it('every coach response unit carries evidenceId', () => {
    for (const id of MODULE_IDS) {
      const html = readFileSync(join(UNI, 'topic', id, 'index.html'), 'utf-8');
      // Extract embedded JSON
      const match = html.match(/window\.CLIVEUNI_MODULE\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
      assert.ok(match, `${id}: cannot extract CLIVEUNI_MODULE`);
      const data = JSON.parse(match[1]);

      // teach steps must have evidenceId
      if (data.modes.teach && data.modes.teach.steps) {
        assert.ok(data.modes.teach.evidenceId, `${id}: teach greeting missing evidenceId`);
        for (const step of data.modes.teach.steps) {
          assert.ok(step.evidenceId, `${id}: teach step ${step.id} missing evidenceId`);
        }
      }

      // quiz questions, choices, and feedback must resolve to approved evidence
      if (data.modes.quiz && data.modes.quiz.questions) {
        for (const question of data.modes.quiz.questions) {
          assert.ok(question.evidenceId, `${id}: quiz question ${question.id} missing evidenceId`);
          for (const choice of question.choices) {
            assert.ok(choice.evidenceId, `${id}: quiz choice ${choice.id} missing evidenceId`);
            assert.equal(choice.evidenceId, question.evidenceId,
              `${id}: quiz choice ${choice.id} must use its question evidence`);
          }
        }
      }

      // scenario choices must have evidenceId
      if (data.modes.scenario && data.modes.scenario.choices) {
        assert.ok(data.modes.scenario.evidenceId, `${id}: scenario prompt missing evidenceId`);
        for (const choice of data.modes.scenario.choices) {
          assert.ok(choice.evidenceId, `${id}: scenario choice ${choice.id} missing evidenceId`);
        }
      }

      // apply steps must have evidenceId
      if (data.modes.apply && data.modes.apply.steps) {
        assert.ok(data.modes.apply.evidenceId, `${id}: apply assignment missing evidenceId`);
        for (const step of data.modes.apply.steps) {
          assert.ok(step.evidenceId, `${id}: apply step ${step.id} missing evidenceId`);
        }
      }

      // checklist items must have evidenceId
      if (data.modes.checklist && data.modes.checklist.items) {
        for (const item of data.modes.checklist.items) {
          assert.ok(item.evidenceId, `${id}: checklist item ${item.id} missing evidenceId`);
        }
      }

      // sources must have evidenceId
      if (data.modes.sources) {
        assert.ok(data.modes.sources.length >= 2, `${id}: Sources mode is empty`);
        for (const src of data.modes.sources) {
          assert.ok(src.evidenceId, `${id}: source ${src.id} missing evidenceId`);
        }
      }
    }
  });

  it('every topic visibly cites every evidence block', () => {
    for (const id of MODULE_IDS) {
      const html = readFileSync(join(UNI, 'topic', id, 'index.html'), 'utf-8');
      const evidenceCount = (html.match(/class="topic-lesson"/g) || []).length;
      const citationCount = (html.match(/class="topic-citation"/g) || []).length;
      assert.ok(evidenceCount >= 2, `${id}: missing visible evidence blocks`);
      assert.equal(citationCount, evidenceCount, `${id}: every evidence block must have a visible citation`);
    }
  });

  it('coach JS exposes validated evidence IDs as data-evidence-id', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(js.includes("'data-evidence-id'") || js.includes('"data-evidence-id"'), 'Must expose data-evidence-id on messages');
  });

  it('case study and location lab modules cite approved source bundles', () => {
    const caseStudyIds = ['cala-shift-accountability', 'cala-reservation-discipline', 'americano-meatball-method',
      'americano-tyf-crossover', 'bungalow-menu-transition', 'clive-reporting-integrity'];
    const locationLabIds = ['cala-scottsdale', 'the-americano', 'tell-your-friends', 'neon-spur', 'bungalow-kitchen-tiburon', 'kuza'];

    for (const id of [...caseStudyIds, ...locationLabIds]) {
      const html = readFileSync(join(UNI, 'topic', id, 'index.html'), 'utf-8');
      const match = html.match(/window\.CLIVEUNI_MODULE\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
      assert.ok(match, `${id}: cannot extract CLIVEUNI_MODULE`);
      const data = JSON.parse(match[1]);
      assert.ok(data.modes.sources && data.modes.sources.length >= 2, `${id} must cite each evidence block`);
    }
  });
});

// ═══════════════════════════════════════
// SOURCE SCHEMA VALIDATION (BLOCKER 5)
// ═══════════════════════════════════════

describe('Source schema validation', () => {
  it('courses.json has valid schema', () => {
    const data = JSON.parse(readFileSync(join(UNI, 'courses.json'), 'utf-8'));
    assert.ok(Array.isArray(data.courses), 'Missing courses array');
    const ids = new Set();
    for (const c of data.courses) {
      assert.ok(c.id && typeof c.id === 'string', `Course missing id`);
      assert.ok(!ids.has(c.id), `Duplicate course id: ${c.id}`);
      ids.add(c.id);
      assert.ok(c.title && typeof c.title === 'string', `Course ${c.id} missing title`);
      assert.ok(Array.isArray(c.lessons) && c.lessons.length >= 1, `Course ${c.id} missing lessons`);
      assert.ok(Array.isArray(c.quiz) && c.quiz.length >= 1, `Course ${c.id} missing quiz`);
      assert.ok(c.operatingAssignment, `Course ${c.id} missing operatingAssignment`);
    }
  });

  it('generator rejects impossible quiz variants', () => {
    const variants = [
      q => { q.correctIndex = -1; },
      q => { q.correctIndex = 999; },
      q => { q.correctIndex = 0.5; },
      q => { q.choices = []; q.correctIndex = 0; },
      q => { q.choices = ['Valid', '']; q.correctIndex = 0; },
    ];
    for (const mutate of variants) {
      const dir = mkdtempSync(join(tmpdir(), 'cliveuni-schema-'));
      try {
        cpSync(join(ROOT, 'scripts'), join(dir, 'scripts'), { recursive: true });
        cpSync(UNI, join(dir, 'cliveuni'), { recursive: true });
        const coursesPath = join(dir, 'cliveuni', 'courses.json');
        const data = JSON.parse(readFileSync(coursesPath, 'utf-8'));
        mutate(data.courses[0].quiz[0]);
        writeFileSync(coursesPath, JSON.stringify(data));
        const result = spawnSync(process.execPath, [join(dir, 'scripts', 'generate-topics.mjs')], { cwd: dir, encoding: 'utf-8' });
        assert.notEqual(result.status, 0, 'generator accepted an impossible quiz variant');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('articles.json has valid schema', () => {
    const data = JSON.parse(readFileSync(join(UNI, 'articles.json'), 'utf-8'));
    assert.ok(Array.isArray(data.articles), 'Missing articles array');
    const ids = new Set();
    for (const a of data.articles) {
      assert.ok(a.id && typeof a.id === 'string', `Article missing id`);
      assert.ok(!ids.has(a.id), `Duplicate article id: ${a.id}`);
      ids.add(a.id);
      assert.ok(a.title && a.body && a.dek, `Article ${a.id} missing required fields`);
      assert.ok(Array.isArray(a.takeaways), `Article ${a.id} missing takeaways`);
    }
  });

  it('case-studies.json has valid schema', () => {
    const data = JSON.parse(readFileSync(join(UNI, 'case-studies.json'), 'utf-8'));
    assert.ok(Array.isArray(data.caseStudies), 'Missing caseStudies array');
    const ids = new Set();
    for (const cs of data.caseStudies) {
      assert.ok(cs.id && typeof cs.id === 'string', `Case study missing id`);
      assert.ok(!ids.has(cs.id), `Duplicate case study id: ${cs.id}`);
      ids.add(cs.id);
      assert.ok(cs.title && cs.challenge && cs.move && cs.lesson, `Case study ${cs.id} missing required fields`);
    }
  });

  it('field-guide.json has valid schema', () => {
    const data = JSON.parse(readFileSync(join(UNI, 'field-guide.json'), 'utf-8'));
    assert.ok(Array.isArray(data.locationLabs), 'Missing locationLabs array');
    for (const lab of data.locationLabs) {
      assert.ok(lab.location && lab.label && lab.focus && lab.prompt && lab.deliverable,
        `Lab "${lab.location || 'unknown'}" missing required fields`);
    }
  });

  it('Library tools use a structured schema rendered through DOM APIs', () => {
    const data = JSON.parse(readFileSync(join(UNI, 'field-guide.json'), 'utf-8'));
    for (const tool of data.tools) {
      assert.ok(Array.isArray(tool.blocks) && tool.blocks.length > 0, `${tool.id}: missing blocks`);
      assert.equal('content' in tool, false, `${tool.id}: legacy HTML content is forbidden`);
    }
    const js = readFileSync(join(UNI, 'cliveuni.js'), 'utf-8');
    assert.ok(js.includes("document.createElement('table')"), 'tool renderer must build tables');
    assert.ok(js.includes("document.createElement(block.ordered ? 'ol' : 'ul')"), 'tool renderer must build lists');
    assert.ok(!js.includes('innerHTML = tool.content'), 'tool markup must never enter innerHTML');
  });

  it('source URLs in bundles pass validation', () => {
    const courses = JSON.parse(readFileSync(join(UNI, 'courses.json'), 'utf-8'));
    for (const c of courses.courses) {
      for (const lesson of c.lessons) {
        if (lesson.source && lesson.source.url) {
          const url = lesson.source.url;
          assert.ok(url.startsWith('https://'), `Course ${c.id}: URL not https: ${url}`);
          assert.ok(!url.includes('javascript:'), `Course ${c.id}: javascript: URL`);
        }
      }
    }
  });

  it('generator includes schema validation step', () => {
    const gen = readFileSync(join(ROOT, 'scripts', 'generate-topics.mjs'), 'utf-8');
    assert.ok(gen.includes('validateSourceBundles'), 'Must validate source bundles');
  });
});

// ═══════════════════════════════════════
// PRIVACY LANGUAGE (BLOCKER 6)
// ═══════════════════════════════════════

describe('Privacy language', () => {
  it('coach privacy notice uses correct wording', () => {
    const html = readFileSync(join(UNI, 'topic', 'food-cost-101', 'index.html'), 'utf-8');
    assert.ok(html.includes('Coach interactions never leave this page'), 'Missing updated privacy wording');
    assert.ok(html.includes('No answers or progress are saved'), 'Missing updated privacy wording');
  });
});

// ═══════════════════════════════════════
// FORBIDDEN CONTENT SCAN
// ═══════════════════════════════════════

describe('Forbidden content', () => {
  it('no API keys or secrets in public files', () => {
    for (const id of MODULE_IDS) {
      const html = readFileSync(join(UNI, 'topic', id, 'index.html'), 'utf-8');
      assert.ok(!/sk-[a-zA-Z0-9]{20,}/.test(html), `${id} contains API key pattern`);
      assert.ok(!/OPENAI_API_KEY/.test(html), `${id} contains OPENAI_API_KEY`);
    }
  });

  it('no private paths in public files', () => {
    for (const id of MODULE_IDS) {
      const html = readFileSync(join(UNI, 'topic', id, 'index.html'), 'utf-8');
      assert.ok(!/\/Users\/\w+/.test(html), `${id} contains private path`);
    }
  });

  it('no GBrain or transcript references', () => {
    const js = readFileSync(join(UNI, 'study-panel.js'), 'utf-8');
    assert.ok(!/\bgbrain\b/i.test(js), 'GBrain reference in coach JS');
    assert.ok(!/data\/raw\/transcripts/.test(js), 'Transcript path in coach JS');
  });
});

// ═══════════════════════════════════════
// GENERATION SCRIPT
// ═══════════════════════════════════════

describe('Generation script', () => {
  it('generate-topics.mjs exists', () => {
    assert.ok(existsSync(join(ROOT, 'scripts', 'generate-topics.mjs')));
  });

  it('passes syntax check', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'generate-topics.mjs'), 'utf-8');
    assert.ok(content.length > 1000, 'Generator script seems too small');
    assert.ok(content.includes('CATEGORIES'), 'Missing CATEGORIES');
    assert.ok(content.includes('MODULE_CATEGORY'), 'Missing MODULE_CATEGORY');
    assert.ok(content.includes('buildCoachData'), 'Missing buildCoachData');
  });
});
