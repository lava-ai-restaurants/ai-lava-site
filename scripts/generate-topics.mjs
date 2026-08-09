#!/usr/bin/env node
/**
 * Clive University Closed-World Generator
 *
 * Reads ONLY committed public-safe JSON bundles from cliveuni/.
 * Produces deterministic, closed-world module pages with embedded
 * coach interaction data. No runtime network calls. No provider dependency.
 *
 * Outputs:
 *   - cliveuni/topic/<module-id>/index.html   (24 module pages)
 *   - cliveuni/learn/index.html               (category overview)
 *   - cliveuni/learn/<category-id>/index.html  (8 category pages)
 *   - cliveuni/stories/index.html
 *   - cliveuni/field/index.html
 *   - cliveuni/library/index.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UNI = join(ROOT, 'cliveuni');

// ── Load source bundles ──
const courses = JSON.parse(readFileSync(join(UNI, 'courses.json'), 'utf-8'));
const articles = JSON.parse(readFileSync(join(UNI, 'articles.json'), 'utf-8'));
const caseStudies = JSON.parse(readFileSync(join(UNI, 'case-studies.json'), 'utf-8'));
const fieldGuide = JSON.parse(readFileSync(join(UNI, 'field-guide.json'), 'utf-8'));

// ── Category definitions ──
const CATEGORIES = [
  { id: 'financial-control', title: 'Financial Control', description: 'Calculate, track, and control the numbers that drive restaurant profitability.' },
  { id: 'labor', title: 'Labor', description: 'Schedule on budget, control overtime, and build shift discipline.' },
  { id: 'inventory', title: 'Inventory', description: 'Recipe costing, shelf-to-sheet inventory, and menu transition management.' },
  { id: 'leadership', title: 'Leadership', description: 'Build a proactive culture, delegate effectively, and develop managers.' },
  { id: 'accountability', title: 'Accountability', description: 'Define the job, set the standard, verify the work, and report with integrity.' },
  { id: 'guest-experience', title: 'Guest Experience', description: 'Table presence, reservation discipline, and cross-concept guest journeys.' },
  { id: 'shift-execution', title: 'Shift Execution', description: 'Handoffs, preparation standards, and shift-level operating discipline.' },
  { id: 'concept-operations', title: 'Concept Operations', description: 'Process corrections, opening readiness, and multi-unit operating systems.' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// ── Module-to-category mapping ──
const MODULE_CATEGORY = {
  'food-cost-101': 'financial-control',
  'weekly-variance': 'financial-control',
  'ideal-vs-actual': 'financial-control',
  'labor-101': 'labor',
  'labor-scheduling-trap': 'labor',
  'cala-scottsdale': 'labor',
  'inventory-101': 'inventory',
  'bungalow-kitchen-tiburon': 'inventory',
  'bungalow-menu-transition': 'inventory',
  'leadership-101': 'leadership',
  'delegation-101': 'leadership',
  'manager-log-discipline': 'leadership',
  'accountability-101': 'accountability',
  'clive-reporting-integrity': 'accountability',
  'cala-shift-accountability': 'accountability',
  'table-touching': 'guest-experience',
  'cala-reservation-discipline': 'guest-experience',
  'americano-tyf-crossover': 'guest-experience',
  'shift-handoff': 'shift-execution',
  'the-americano': 'shift-execution',
  'tell-your-friends': 'shift-execution',
  'americano-meatball-method': 'concept-operations',
  'neon-spur': 'concept-operations',
  'kuza': 'concept-operations',
};

// ── Level assignments ──
const MODULE_LEVEL = {
  'food-cost-101': 'foundational', 'labor-101': 'foundational', 'inventory-101': 'foundational',
  'accountability-101': 'foundational', 'delegation-101': 'intermediate', 'leadership-101': 'intermediate',
  'weekly-variance': 'foundational', 'shift-handoff': 'foundational', 'labor-scheduling-trap': 'foundational',
  'manager-log-discipline': 'foundational', 'ideal-vs-actual': 'intermediate', 'table-touching': 'foundational',
  'cala-shift-accountability': 'intermediate', 'cala-reservation-discipline': 'intermediate',
  'americano-meatball-method': 'intermediate', 'americano-tyf-crossover': 'advanced',
  'bungalow-menu-transition': 'intermediate', 'clive-reporting-integrity': 'advanced',
  'cala-scottsdale': 'intermediate', 'the-americano': 'intermediate', 'tell-your-friends': 'intermediate',
  'bungalow-kitchen-tiburon': 'intermediate', 'neon-spur': 'foundational', 'kuza': 'foundational',
};

// ── ASCII slug validator ──
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(id, source) {
  if (!SLUG_RE.test(id)) throw new Error(`Invalid topic slug "${id}" from ${source}`);
  return id;
}

function locationSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Safe JSON-for-script serializer ──
// Escapes <, >, &, U+2028, U+2029, and </script> terminators
// so JSON can be safely embedded in an inline <script> tag.
function safeJsonForScript(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// ── URL validation ──
const ALLOWED_HTTPS_HOSTS = new Set([
  'www.youtube.com', 'youtube.com', 'youtu.be', 'weareclive.com', 'www.weareclive.com',
]);

function isValidCitationUrl(url) {
  if (!url || typeof url !== 'string') return false;
  // Allow same-site relative URLs
  if (url.startsWith('./') || url.startsWith('../') || (url.startsWith('/') && !url.startsWith('//'))) {
    if (/[\\@]/.test(url)) return false;
    return true;
  }
  // Reject javascript:, data:, protocol-relative, backslashes, credentials
  if (/^javascript:/i.test(url)) return false;
  if (/^data:/i.test(url)) return false;
  if (url.startsWith('//')) return false;
  if (/[\\]/.test(url)) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    if (!ALLOWED_HTTPS_HOSTS.has(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

// Validate all citations centrally during module construction
function validateCitations(citations, moduleId) {
  for (const cit of citations) {
    if (cit && cit.url && !isValidCitationUrl(cit.url)) {
      throw new Error(`Unsafe citation URL in module "${moduleId}": ${cit.url}`);
    }
  }
}

// ── Source bundle schema validation ──
function validateSourceBundles() {
  // courses.json
  if (!Array.isArray(courses.courses)) throw new Error('courses.json: missing courses array');
  const courseIds = new Set();
  for (const c of courses.courses) {
    if (!c.id || typeof c.id !== 'string') throw new Error('courses.json: course missing id');
    if (courseIds.has(c.id)) throw new Error(`courses.json: duplicate course id "${c.id}"`);
    courseIds.add(c.id);
    if (!c.title || typeof c.title !== 'string') throw new Error(`courses.json: course "${c.id}" missing title`);
    if (!Array.isArray(c.lessons) || c.lessons.length < 1) throw new Error(`courses.json: course "${c.id}" missing lessons`);
    if (!Array.isArray(c.quiz) || c.quiz.length < 1) throw new Error(`courses.json: course "${c.id}" missing quiz`);
    if (!c.operatingAssignment) throw new Error(`courses.json: course "${c.id}" missing operatingAssignment`);
    for (const lesson of c.lessons) {
      if (!lesson.title || !lesson.summary) throw new Error(`courses.json: lesson in "${c.id}" missing title/summary`);
      if (lesson.source && lesson.source.url && !isValidCitationUrl(lesson.source.url)) {
        throw new Error(`courses.json: unsafe URL in course "${c.id}": ${lesson.source.url}`);
      }
    }
    for (const q of c.quiz) {
      if (!q.question || typeof q.question !== 'string' ||
          !Array.isArray(q.choices) || q.choices.length < 2 ||
          q.choices.some(choice => typeof choice !== 'string' || !choice.trim()) ||
          !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.choices.length) {
        throw new Error(`courses.json: malformed quiz in "${c.id}"`);
      }
    }
  }

  // articles.json
  if (!Array.isArray(articles.articles)) throw new Error('articles.json: missing articles array');
  const articleIds = new Set();
  for (const a of articles.articles) {
    if (!a.id || typeof a.id !== 'string') throw new Error('articles.json: article missing id');
    if (articleIds.has(a.id)) throw new Error(`articles.json: duplicate article id "${a.id}"`);
    articleIds.add(a.id);
    if (!a.title || !a.body || !a.dek) throw new Error(`articles.json: article "${a.id}" missing required fields`);
    if (!Array.isArray(a.takeaways)) throw new Error(`articles.json: article "${a.id}" missing takeaways`);
    if (a.sourceUrl && !isValidCitationUrl(a.sourceUrl)) {
      throw new Error(`articles.json: unsafe URL in article "${a.id}": ${a.sourceUrl}`);
    }
  }

  // case-studies.json
  if (!Array.isArray(caseStudies.caseStudies)) throw new Error('case-studies.json: missing caseStudies array');
  const csIds = new Set();
  for (const cs of caseStudies.caseStudies) {
    if (!cs.id || typeof cs.id !== 'string') throw new Error('case-studies.json: case study missing id');
    if (csIds.has(cs.id)) throw new Error(`case-studies.json: duplicate id "${cs.id}"`);
    csIds.add(cs.id);
    if (!cs.title || !cs.challenge || !cs.move || !cs.lesson) {
      throw new Error(`case-studies.json: case study "${cs.id}" missing required fields`);
    }
  }

  // field-guide.json
  if (!Array.isArray(fieldGuide.locationLabs)) throw new Error('field-guide.json: missing locationLabs array');
  for (const lab of fieldGuide.locationLabs) {
    if (!lab.location || !lab.label || !lab.focus || !lab.prompt || !lab.deliverable) {
      throw new Error(`field-guide.json: lab "${lab.location || 'unknown'}" missing required fields`);
    }
  }
  if (!Array.isArray(fieldGuide.tools)) throw new Error('field-guide.json: missing tools array');
  const allowedBlockTypes = new Set(['paragraph', 'heading', 'field', 'list', 'table']);
  for (const tool of fieldGuide.tools) {
    if (!tool.id || !tool.title || !tool.category || !Array.isArray(tool.blocks) || tool.blocks.length < 1) {
      throw new Error(`field-guide.json: malformed tool "${tool.id || 'unknown'}"`);
    }
    for (const block of tool.blocks) {
      if (!block || !allowedBlockTypes.has(block.type)) {
        throw new Error(`field-guide.json: unsupported block in tool "${tool.id}"`);
      }
      if (block.type === 'paragraph' || block.type === 'heading') {
        if (typeof block.text !== 'string' || !block.text.trim()) throw new Error(`field-guide.json: empty text block in "${tool.id}"`);
      } else if (block.type === 'field') {
        if (typeof block.label !== 'string' || typeof block.value !== 'string') throw new Error(`field-guide.json: malformed field in "${tool.id}"`);
      } else if (block.type === 'list') {
        if (!Array.isArray(block.items) || block.items.length < 1 || block.items.some(item => typeof item !== 'string')) throw new Error(`field-guide.json: malformed list in "${tool.id}"`);
      } else if (block.type === 'table') {
        if (!Array.isArray(block.headers) || block.headers.length < 1 || !Array.isArray(block.rows) || block.rows.some(row => !Array.isArray(row) || row.length !== block.headers.length)) throw new Error(`field-guide.json: malformed table in "${tool.id}"`);
      }
    }
  }
}

validateSourceBundles();
console.log('Source bundle schema validation passed');

// ── Build source lookups ──
const courseMap = Object.fromEntries(courses.courses.map(c => [c.id, c]));
const articleMap = Object.fromEntries(articles.articles.map(a => [a.id, a]));
const caseStudyMap = Object.fromEntries(caseStudies.caseStudies.map(cs => [cs.id, cs]));
const labMap = Object.fromEntries(fieldGuide.locationLabs.map(l => [locationSlug(l.location), l]));

// ── Construct modules ──
const modules = [];
const seenIds = new Set();

function addModule(mod) {
  validateSlug(mod.id, mod.sourceType);
  if (seenIds.has(mod.id)) throw new Error(`Module ID collision: "${mod.id}"`);
  seenIds.add(mod.id);
  modules.push(mod);
}

// Build modules from courses
for (const course of courses.courses) {
  const citations = [];
  const evidence = course.lessons.map((lesson, i) => {
    const cit = lesson.source ? { title: lesson.source.title, url: lesson.source.url } : null;
    if (cit) citations.push(cit);
    return {
      id: `${course.id}-ev-${i}`,
      title: lesson.title,
      content: lesson.summary,
      citation: cit,
    };
  });

  validateCitations(citations, course.id);

  addModule({
    id: course.id,
    sourceType: 'course',
    category: MODULE_CATEGORY[course.id],
    level: MODULE_LEVEL[course.id] || 'foundational',
    duration: `${course.lessons.length * 5 + 5} min`,
    title: course.title,
    objective: course.subtitle,
    evidence,
    knowledgeChecks: course.quiz.map((q, i) => ({
      id: `${course.id}-kc-${i}`,
      question: q.question,
      choices: q.choices.map((ch, ci) => ({
        id: `${course.id}-kc-${i}-${ci}`,
        text: ch,
        correct: ci === q.correctIndex,
        feedback: ci === q.correctIndex ? q.explanation : `Incorrect. ${q.explanation}`,
      })),
    })),
    fieldAssignment: course.operatingAssignment,
    citations,
    relatedModules: [],
  });
}

// Build modules from articles
for (const article of articles.articles) {
  const sourceCitation = article.sourceUrl
    ? { title: article.sourceNote || article.title, url: article.sourceUrl }
    : { title: `${article.title} — approved Clive University article source`, url: '../../articles.json' };
  const citations = [sourceCitation, sourceCitation];

  // Split body into 2 evidence blocks at a paragraph-safe boundary.
  // We split on '. ' only when followed by an uppercase letter (sentence start),
  // preserving abbreviations like 'vs.' and short sentences like 'It is a discipline.'
  const body = article.body;
  const sentenceBreaks = [];
  const sentenceRe = /\. (?=[A-Z])/g;
  let match;
  while ((match = sentenceRe.exec(body)) !== null) {
    sentenceBreaks.push(match.index + 2); // position after '. '
  }
  // Pick the midpoint break
  let splitPos;
  if (sentenceBreaks.length >= 2) {
    const midIdx = Math.ceil(sentenceBreaks.length / 2);
    splitPos = sentenceBreaks[midIdx - 1];
  } else {
    splitPos = Math.ceil(body.length / 2);
  }
  const block1 = body.substring(0, splitPos).trim();
  const block2 = body.substring(splitPos).trim();
  // Verify: joining blocks reproduces the original body exactly
  const reconstructed = block1 + (block2 ? ' ' + block2 : '');
  if (reconstructed !== body) {
    throw new Error(`Article body split integrity failure for "${article.id}": reconstruction mismatch`)
  }

  const evidence = [
    { id: `${article.id}-ev-0`, title: article.title, content: block1, citation: citations[0] },
    { id: `${article.id}-ev-1`, title: 'Key Insights', content: block2, citation: citations[1] },
  ];

  // Create knowledge checks from takeaways
  const kcs = [];
  if (article.takeaways && article.takeaways.length >= 2) {
    kcs.push({
      id: `${article.id}-kc-0`,
      question: `According to "${article.title}", what is the recommended approach?`,
      choices: [
        { id: `${article.id}-kc-0-0`, text: article.takeaways[0], correct: true, feedback: `Correct. ${article.takeaways[0]}` },
        { id: `${article.id}-kc-0-1`, text: 'Wait until the end of the quarter to review results.', correct: false, feedback: `Incorrect. The recommended approach is: ${article.takeaways[0]}` },
        { id: `${article.id}-kc-0-2`, text: 'Delegate all responsibility without verification.', correct: false, feedback: `Incorrect. The recommended approach is: ${article.takeaways[0]}` },
      ],
    });
    kcs.push({
      id: `${article.id}-kc-1`,
      question: `What is a key takeaway from "${article.title}"?`,
      choices: [
        { id: `${article.id}-kc-1-0`, text: 'None of the practices described matter in real operations.', correct: false, feedback: `Incorrect. A key takeaway is: ${article.takeaways[1]}` },
        { id: `${article.id}-kc-1-1`, text: article.takeaways[1], correct: true, feedback: `Correct. ${article.takeaways[1]}` },
        { id: `${article.id}-kc-1-2`, text: 'Only large restaurant chains need these systems.', correct: false, feedback: `Incorrect. A key takeaway is: ${article.takeaways[1]}` },
      ],
    });
  }

  validateCitations(citations, article.id);

  addModule({
    id: article.id,
    sourceType: 'article',
    category: MODULE_CATEGORY[article.id],
    level: MODULE_LEVEL[article.id] || 'foundational',
    duration: article.readingTime || '5 min',
    title: article.title,
    objective: article.dek,
    evidence,
    knowledgeChecks: kcs,
    fieldAssignment: `Apply the principles from "${article.title}" to your current operation. Identify one area where this approach is not yet in practice and implement it this week.`,
    citations,
    provenance: article.provenance,
    relatedModules: [],
  });
}

// Build modules from case studies
for (const cs of caseStudies.caseStudies) {
  const sourceCitation = { title: `${cs.title} — approved Clive University case-study source`, url: '../../case-studies.json' };
  const evidence = [
    { id: `${cs.id}-ev-0`, title: 'Challenge', content: cs.challenge, citation: sourceCitation },
    { id: `${cs.id}-ev-1`, title: 'Move', content: cs.move, citation: sourceCitation },
    { id: `${cs.id}-ev-2`, title: 'Operating Lesson', content: cs.lesson, citation: sourceCitation },
  ];

  const kcs = [
    {
      id: `${cs.id}-kc-0`,
      question: `What was the core challenge in "${cs.title}"?`,
      choices: [
        { id: `${cs.id}-kc-0-0`, text: cs.challenge.substring(0, 120) + '...', correct: true, feedback: `Correct. The challenge was about establishing better operating structure.` },
        { id: `${cs.id}-kc-0-1`, text: 'There was no significant challenge; everything was running smoothly.', correct: false, feedback: `Incorrect. The case study describes a specific operational challenge that required a structured response.` },
        { id: `${cs.id}-kc-0-2`, text: 'The restaurant needed to be closed and rebuilt.', correct: false, feedback: `Incorrect. The challenge was operational, not structural.` },
      ],
    },
    {
      id: `${cs.id}-kc-1`,
      question: `What is the operating lesson from "${cs.title}"?`,
      choices: [
        { id: `${cs.id}-kc-1-0`, text: 'Operating lessons are not applicable to other locations.', correct: false, feedback: `Incorrect. The operating lesson is: ${cs.lesson}` },
        { id: `${cs.id}-kc-1-1`, text: cs.lesson.substring(0, 120) + (cs.lesson.length > 120 ? '...' : ''), correct: true, feedback: `Correct. ${cs.lesson}` },
        { id: `${cs.id}-kc-1-2`, text: 'The only solution is to hire more staff.', correct: false, feedback: `Incorrect. The operating lesson is: ${cs.lesson}` },
      ],
    },
  ];

  const csCitations = evidence.map(ev => ev.citation);
  validateCitations(csCitations, cs.id);

  addModule({
    id: cs.id,
    sourceType: 'case-study',
    category: MODULE_CATEGORY[cs.id],
    level: MODULE_LEVEL[cs.id] || 'intermediate',
    duration: '10 min',
    title: cs.title,
    objective: `${cs.location} operating story`,
    evidence,
    knowledgeChecks: kcs,
    fieldAssignment: `Review your own operation for a similar challenge to the one described in "${cs.title}." Identify where accountability gaps or process inconsistencies exist and propose one concrete improvement.`,
    citations: csCitations,
    provenance: cs.provenance,
    image: cs.image || null,
    location: cs.location,
    relatedModules: [],
  });
}

// Build modules from location labs
for (const lab of fieldGuide.locationLabs) {
  const id = locationSlug(lab.location);
  const sourceCitation = { title: `${lab.location} — approved Clive University field-guide source`, url: '../../field-guide.json' };
  const evidence = [
    { id: `${id}-ev-0`, title: `${lab.label}: ${lab.focus}`, content: lab.prompt, citation: sourceCitation },
    { id: `${id}-ev-1`, title: 'Deliverable', content: lab.deliverable, citation: sourceCitation },
  ];

  const kcs = [
    {
      id: `${id}-kc-0`,
      question: `What is the focus of the ${lab.location} ${lab.label.toLowerCase()}?`,
      choices: [
        { id: `${id}-kc-0-0`, text: lab.focus, correct: true, feedback: `Correct. The focus is: ${lab.focus}` },
        { id: `${id}-kc-0-1`, text: 'General restaurant decoration and ambiance.', correct: false, feedback: `Incorrect. The focus is: ${lab.focus}` },
        { id: `${id}-kc-0-2`, text: 'Marketing campaign development.', correct: false, feedback: `Incorrect. The focus is: ${lab.focus}` },
      ],
    },
    {
      id: `${id}-kc-1`,
      question: `What deliverable is expected from the ${lab.location} exercise?`,
      choices: [
        { id: `${id}-kc-1-0`, text: 'No specific deliverable is required.', correct: false, feedback: `Incorrect. The expected deliverable is: ${lab.deliverable.substring(0, 100)}...` },
        { id: `${id}-kc-1-1`, text: lab.deliverable.substring(0, 120) + (lab.deliverable.length > 120 ? '...' : ''), correct: true, feedback: `Correct. This exercise produces a concrete, actionable deliverable.` },
        { id: `${id}-kc-1-2`, text: 'A presentation to corporate leadership.', correct: false, feedback: `Incorrect. The expected deliverable is: ${lab.deliverable.substring(0, 100)}...` },
      ],
    },
  ];

  const labCitations = evidence.map(ev => ev.citation);
  validateCitations(labCitations, id);

  addModule({
    id,
    sourceType: 'location-lab',
    category: MODULE_CATEGORY[id],
    level: MODULE_LEVEL[id] || 'intermediate',
    duration: '15 min',
    title: `${lab.location} — ${lab.label}`,
    objective: lab.focus,
    evidence,
    knowledgeChecks: kcs,
    fieldAssignment: lab.deliverable,
    citations: labCitations,
    provenance: lab.provenance || null,
    location: lab.location,
    relatedModules: [],
  });
}

// ── Build related modules ──
for (const mod of modules) {
  const related = modules
    .filter(m => m.id !== mod.id && m.category === mod.category)
    .map(m => m.id)
    .slice(0, 3);
  // Also add cross-category relations for courses
  if (mod.sourceType === 'course') {
    for (const m of modules) {
      if (m.id !== mod.id && m.sourceType === 'article' && m.category === mod.category && !related.includes(m.id)) {
        related.push(m.id);
      }
    }
  }
  mod.relatedModules = related.slice(0, 4);
}

// ── Validate ──
if (modules.length < 24) throw new Error(`Expected >=24 modules, got ${modules.length}`);
const categoryIds = new Set(modules.map(m => m.category));
if (categoryIds.size !== 8) throw new Error(`Expected 8 categories, got ${categoryIds.size}`);
for (const mod of modules) {
  if (!CATEGORY_MAP[mod.category]) throw new Error(`Unknown category "${mod.category}" for module "${mod.id}"`);
  if (mod.evidence.length < 2) throw new Error(`Module "${mod.id}" has <2 evidence blocks`);
  if (mod.knowledgeChecks.length < 1) throw new Error(`Module "${mod.id}" has no knowledge checks`); // relaxed for labs that may have 1
  if (!Array.isArray(mod.citations) || mod.citations.length < mod.evidence.length) {
    throw new Error(`Module "${mod.id}" does not cite every evidence block`);
  }
  for (const ev of mod.evidence) {
    if (!ev.id || !ev.content) throw new Error(`Evidence block missing id/content in "${mod.id}"`);
    if (!ev.citation || !ev.citation.title || !isValidCitationUrl(ev.citation.url)) {
      throw new Error(`Evidence block "${ev.id}" missing valid citation in "${mod.id}"`);
    }
  }
}

console.log(`Constructed ${modules.length} modules across ${categoryIds.size} categories`);

// ── Coach data generation ──
function buildCoachData(mod) {
  const cat = CATEGORY_MAP[mod.category];

  // Teach mode: step through evidence
  const teachSteps = mod.evidence.map((ev, i) => ({
    id: `${mod.id}-teach-${i}`,
    content: ev.content,
    title: ev.title,
    evidenceId: ev.id,
    citation: ev.citation,
  }));

  // Quiz mode: knowledge checks
  const quizQuestions = mod.knowledgeChecks.map((kc, questionIndex) => {
    const evidenceId = mod.evidence[Math.min(questionIndex, mod.evidence.length - 1)].id;
    return {
      id: kc.id,
      question: kc.question,
      evidenceId,
      choices: kc.choices.map(ch => ({
        id: ch.id,
        text: ch.text,
        correct: ch.correct,
        feedback: ch.feedback,
        evidenceId,
      })),
    };
  });

  // Scenario mode: composite prompt from evidence
  const scenarioContext = mod.evidence.map(ev => ev.content).join(' ');
  const scenarioPrompt = mod.sourceType === 'case-study'
    ? `A restaurant faces a challenge similar to this case study. The situation involves: ${mod.evidence[0].content.substring(0, 200)}... As a manager, consider how you would approach this.`
    : mod.sourceType === 'location-lab'
    ? `You are a manager preparing for this exercise. The focus is: ${mod.objective}. Consider the key areas you need to evaluate.`
    : `You are a restaurant manager applying the principles from "${mod.title}." Consider how to implement ${mod.objective.toLowerCase()} in your operation.`;

  const scenarioChoices = [
    {
      id: `${mod.id}-scenario-a`,
      label: 'What should I focus on first?',
      feedback: `Start with the fundamentals: ${mod.evidence[0].content.substring(0, 200)}`,
      evidenceId: mod.evidence[0].id,
    },
    {
      id: `${mod.id}-scenario-b`,
      label: 'What are the common mistakes?',
      feedback: mod.evidence.length > 1
        ? `A common mistake is skipping the foundational step. ${mod.evidence[1].content.substring(0, 200)}`
        : `A common mistake is not following through consistently. ${mod.evidence[0].content.substring(0, 200)}`,
      evidenceId: mod.evidence[Math.min(1, mod.evidence.length - 1)].id,
    },
    {
      id: `${mod.id}-scenario-c`,
      label: 'How do I measure success?',
      feedback: `Success is measured by consistent execution. ${mod.fieldAssignment.substring(0, 200)}`,
      evidenceId: mod.evidence[0].id,
    },
  ];

  // Apply mode: field assignment steps
  // Split on '. ' followed by uppercase to preserve abbreviations
  const assignmentSentences = mod.fieldAssignment.split(/\. (?=[A-Z])/).filter(s => s.trim().length > 5);
  const applySteps = assignmentSentences.map((s, i) => ({
    id: `${mod.id}-apply-${i}`,
    text: s.trim() + (s.trim().endsWith('.') ? '' : '.'),
    evidenceId: mod.evidence[Math.min(i, mod.evidence.length - 1)].id,
  }));

  // Checklist mode: actionable items from evidence + assignment
  const checklistItems = [];
  for (const ev of mod.evidence) {
    // Split on '. ' followed by uppercase to preserve abbreviations
    const firstSentence = ev.content.split(/\. (?=[A-Z])/)[0] + (ev.content.split(/\. (?=[A-Z])/)[0].endsWith('.') ? '' : '.');
    checklistItems.push({
      id: `${mod.id}-check-${checklistItems.length}`,
      text: firstSentence,
      evidenceId: ev.id,
    });
  }
  if (assignmentSentences.length > 0) {
    checklistItems.push({
      id: `${mod.id}-check-${checklistItems.length}`,
      text: assignmentSentences[0].trim() + (assignmentSentences[0].endsWith('.') ? '' : '.'),
      evidenceId: mod.evidence[0].id,
    });
  }

  // Sources mode: citations
  const sources = mod.citations.map((cit, i) => ({
    id: `${mod.id}-src-${i}`,
    title: cit.title,
    url: cit.url,
    evidenceId: mod.evidence[Math.min(i, mod.evidence.length - 1)].id,
  }));

  return {
    moduleId: mod.id,
    title: mod.title,
    category: cat.title,
    objective: mod.objective,
    modes: {
      teach: {
        greeting: `Welcome to "${mod.title}." ${mod.objective}. Let me walk you through the key concepts.`,
        evidenceId: mod.evidence[0].id,
        steps: teachSteps,
      },
      quiz: { questions: quizQuestions },
      scenario: {
        id: `${mod.id}-scenario`,
        prompt: scenarioPrompt,
        evidenceId: mod.evidence[0].id,
        choices: scenarioChoices,
      },
      apply: {
        id: `${mod.id}-apply`,
        assignment: mod.fieldAssignment,
        evidenceId: mod.evidence[0].id,
        steps: applySteps,
      },
      checklist: {
        id: `${mod.id}-checklist`,
        items: checklistItems,
      },
      sources: sources,
    },
  };
}

// ── HTML escaping ──
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Shared page shell ──
function pageShell(title, breadcrumbs, bodyContent, options = {}) {
  const { moduleData, activeNav, description } = options;
  const depthToRoot = options.depth || 0;
  const prefix = depthToRoot > 0 ? '../'.repeat(depthToRoot) : '';

  const coachPanelHTML = moduleData ? `
  <!-- Clive Study Coach Panel -->
  <aside id="study-panel" class="study-panel" role="dialog" aria-modal="true" aria-labelledby="study-panel-title" hidden>
    <div class="study-panel-header">
      <h3 id="study-panel-title">Clive Study Coach</h3>
      <button type="button" class="study-panel-close" aria-label="Close study coach">&times;</button>
    </div>
    <div class="study-panel-privacy">Coach interactions never leave this page. No answers or progress are saved.</div>
    <div class="study-panel-modes" role="group" aria-label="Coach mode">
      <button type="button" class="study-mode-btn active" data-mode="teach">Teach</button>
      <button type="button" class="study-mode-btn" data-mode="quiz">Quiz</button>
      <button type="button" class="study-mode-btn" data-mode="scenario">Scenario</button>
      <button type="button" class="study-mode-btn" data-mode="apply">Apply</button>
      <button type="button" class="study-mode-btn" data-mode="checklist">Checklist</button>
      <button type="button" class="study-mode-btn" data-mode="sources">Sources</button>
    </div>
    <div class="study-panel-messages" id="study-messages" role="log" aria-live="polite" aria-label="Coach conversation"></div>
    <div class="study-panel-actions" id="study-actions" aria-label="Available actions"></div>
    <div class="study-panel-footer">
      <button type="button" class="study-reset-btn" id="study-reset">Reset conversation</button>
    </div>
  </aside>
  <button type="button" class="study-fab" id="study-fab" aria-label="Open Clive Study Coach" title="Study Coach">
    <span class="study-fab-icon" aria-hidden="true"></span>
    <span class="study-fab-label">Study</span>
  </button>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)} — Clive University</title>
<meta name="description" content="${esc(description || title)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x1F393;</text></svg>">
<link rel="stylesheet" href="${prefix}cliveuni.css">
<link rel="stylesheet" href="${prefix}study-panel.css">
</head>
<body>
<a href="#main-content" class="skip-link">Skip to content</a>

<header class="site-header" role="banner">
  <div class="header-inner">
    <a href="${prefix}index.html" class="header-brand" aria-label="Clive University home">
      <img src="${prefix}assets/clive-collective-logo.webp" alt="Clive Collective" class="header-logo" width="40" height="40">
      <span class="header-title">University</span>
    </a>
    <nav class="desktop-nav" aria-label="Primary navigation">
      <a href="${prefix}index.html" class="nav-link${activeNav === 'today' ? ' active' : ''}">Today</a>
      <a href="${prefix}learn/index.html" class="nav-link${activeNav === 'learn' ? ' active' : ''}">Learn</a>
      <a href="${prefix}stories/index.html" class="nav-link${activeNav === 'stories' ? ' active' : ''}">Stories</a>
      <a href="${prefix}field/index.html" class="nav-link${activeNav === 'field' ? ' active' : ''}">Field</a>
      <a href="${prefix}library/index.html" class="nav-link${activeNav === 'library' ? ' active' : ''}">Library</a>
    </nav>
  </div>
</header>

<main id="main-content">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li><a href="${prefix}index.html">Clive University</a></li>
      ${breadcrumbs.map(b => `<li>${b.href ? `<a href="${esc(b.href)}">${esc(b.label)}</a>` : `<span aria-current="page">${esc(b.label)}</span>`}</li>`).join('\n      ')}
    </ol>
  </nav>
  ${bodyContent}
</main>

${coachPanelHTML}

<footer>
  <div class="container">
    <div class="footer-inner">
      <div class="footer-brand-block">
        <img src="${prefix}assets/clive-collective-logo.webp" alt="Clive Collective" class="footer-logo" width="32" height="32">
        <span class="footer-brand-name">Clive University</span>
      </div>
      <p class="footer-disclaimer">Source-backed learning and advisory decision support. This content is not Clive policy until adopted by an authorized operator. No employee data is collected or transmitted.</p>
      <div class="footer-links">
        <a href="https://weareclive.com" target="_blank" rel="noopener">weareclive.com</a>
        <span class="footer-sep">&middot;</span>
        <span class="footer-built">Built with LAVA</span>
      </div>
    </div>
  </div>
</footer>

<nav class="bottom-nav" aria-label="Mobile navigation">
  <a href="${prefix}index.html" class="bottom-nav-item${activeNav === 'today' ? ' active' : ''}">
    <span class="bottom-nav-icon bottom-nav-icon--today" aria-hidden="true"></span>
    <span class="bottom-nav-label">Today</span>
  </a>
  <a href="${prefix}learn/index.html" class="bottom-nav-item${activeNav === 'learn' ? ' active' : ''}">
    <span class="bottom-nav-icon bottom-nav-icon--learn" aria-hidden="true"></span>
    <span class="bottom-nav-label">Learn</span>
  </a>
  <a href="${prefix}stories/index.html" class="bottom-nav-item${activeNav === 'stories' ? ' active' : ''}">
    <span class="bottom-nav-icon bottom-nav-icon--stories" aria-hidden="true"></span>
    <span class="bottom-nav-label">Stories</span>
  </a>
  <a href="${prefix}field/index.html" class="bottom-nav-item${activeNav === 'field' ? ' active' : ''}">
    <span class="bottom-nav-icon bottom-nav-icon--field" aria-hidden="true"></span>
    <span class="bottom-nav-label">Field</span>
  </a>
  <a href="${prefix}library/index.html" class="bottom-nav-item${activeNav === 'library' ? ' active' : ''}">
    <span class="bottom-nav-icon bottom-nav-icon--library" aria-hidden="true"></span>
    <span class="bottom-nav-label">Library</span>
  </a>
</nav>

${moduleData ? `<script>window.CLIVEUNI_MODULE = ${safeJsonForScript(moduleData)};</script>
<script src="${prefix}study-panel.js"></script>` : ''}
</body>
</html>`;
}

// ── Generate module pages ──
function generateModulePage(mod) {
  const dir = join(UNI, 'topic', mod.id);
  mkdirSync(dir, { recursive: true });

  const cat = CATEGORY_MAP[mod.category];
  const sectionNav = mod.sourceType === 'course' ? 'learn'
    : mod.sourceType === 'case-study' ? 'stories'
    : mod.sourceType === 'location-lab' ? 'field'
    : 'library';

  const breadcrumbs = [
    { label: 'Learn', href: '../../learn/index.html' },
    { label: cat.title, href: `../../learn/${mod.category}/index.html` },
    { label: mod.title },
  ];

  let body = `<article class="topic-page">`;
  body += `<div class="container">`;
  body += `<div class="topic-content">`;

  // Header
  body += `<header class="topic-header">`;
  body += `<div class="topic-badges">`;
  body += `<span class="topic-type-badge">${esc(cat.title)}</span>`;
  body += `<span class="topic-level-badge topic-level-badge--${mod.level}">${esc(mod.level)}</span>`;
  body += `</div>`;
  body += `<h1>${esc(mod.title)}</h1>`;
  body += `<p class="topic-subtitle">${esc(mod.objective)}</p>`;
  body += `<div class="topic-meta"><span class="topic-duration">${esc(mod.duration)}</span><span class="topic-evidence-count">${mod.evidence.length} lessons</span><span class="topic-check-count">${mod.knowledgeChecks.length} checks</span></div>`;
  if (mod.provenance) body += `<p class="topic-provenance">${esc(mod.provenance)}</p>`;
  body += `</header>`;

  // Evidence blocks
  body += `<section class="topic-lessons" aria-label="Lessons">`;
  body += `<h2>Lessons</h2>`;
  for (const ev of mod.evidence) {
    body += `<div class="topic-lesson" data-evidence-id="${esc(ev.id)}">`;
    body += `<h3>${esc(ev.title)}</h3>`;
    body += `<p>${esc(ev.content)}</p>`;
    if (ev.citation) {
      body += `<div class="topic-citation">`;
      body += `<a href="${esc(ev.citation.url)}" target="_blank" rel="noopener">${esc(ev.citation.title)}</a>`;
      body += `</div>`;
    }
    body += `</div>`;
  }
  body += `</section>`;

  // Knowledge checks
  if (mod.knowledgeChecks.length > 0) {
    body += `<section class="topic-quiz" aria-label="Knowledge check">`;
    body += `<h2>Knowledge Check</h2>`;
    for (const kc of mod.knowledgeChecks) {
      body += `<div class="topic-quiz-item" data-check-id="${esc(kc.id)}">`;
      body += `<p class="quiz-question"><strong>${esc(kc.question)}</strong></p>`;
      body += `<ul class="quiz-choices">`;
      for (const ch of kc.choices) {
        body += `<li>${esc(ch.text)}</li>`;
      }
      body += `</ul>`;
      body += `</div>`;
    }
    body += `</section>`;
  }

  // Field assignment
  body += `<section class="topic-assignment" aria-label="Field assignment">`;
  body += `<h2>Field Assignment</h2>`;
  body += `<p>${esc(mod.fieldAssignment)}</p>`;
  body += `</section>`;

  // Image (case studies)
  if (mod.image) {
    body += `<div class="topic-image"><img src="../../assets/${esc(mod.image)}" alt="${esc(mod.location || mod.title)}" loading="lazy"></div>`;
  }

  // Related modules
  if (mod.relatedModules.length > 0) {
    body += `<nav class="topic-related" aria-label="Related modules">`;
    body += `<h2>Related Modules</h2><ul>`;
    for (const rid of mod.relatedModules) {
      const rm = modules.find(m => m.id === rid);
      if (rm) body += `<li><a href="../${esc(rid)}/index.html">${esc(rm.title)}</a></li>`;
    }
    body += `</ul></nav>`;
  }

  body += `</div></div></article>`;

  const coachData = buildCoachData(mod);

  const html = pageShell(mod.title, breadcrumbs, body, {
    moduleData: coachData,
    depth: 2,
    activeNav: sectionNav,
    description: mod.objective,
  });

  writeFileSync(join(dir, 'index.html'), html);
}

// Generate all module pages
for (const mod of modules) {
  generateModulePage(mod);
}
console.log(`Generated ${modules.length} module pages under cliveuni/topic/`);

// ── Generate category pages ──
function generateCategoryPage(cat) {
  const dir = join(UNI, 'learn', cat.id);
  mkdirSync(dir, { recursive: true });

  const catModules = modules.filter(m => m.category === cat.id);
  const breadcrumbs = [
    { label: 'Learn', href: '../index.html' },
    { label: cat.title },
  ];

  let body = `<div class="container">`;
  body += `<p class="section-label">${esc(cat.title)}</p>`;
  body += `<h1 class="view-title">${esc(cat.description)}</h1>`;
  body += `<div class="module-grid">`;

  for (const mod of catModules) {
    body += `<a href="../../topic/${esc(mod.id)}/index.html" class="module-card">`;
    body += `<span class="module-level module-level--${mod.level}">${esc(mod.level)}</span>`;
    body += `<h3>${esc(mod.title)}</h3>`;
    body += `<p>${esc(mod.objective)}</p>`;
    body += `<span class="module-meta">${mod.evidence.length} lessons &middot; ${mod.knowledgeChecks.length} checks &middot; ${esc(mod.duration)}</span>`;
    body += `</a>`;
  }

  body += `</div></div>`;

  const html = pageShell(cat.title, breadcrumbs, body, {
    depth: 2,
    activeNav: 'learn',
    description: cat.description,
  });

  writeFileSync(join(dir, 'index.html'), html);
}

for (const cat of CATEGORIES) {
  generateCategoryPage(cat);
}
console.log(`Generated ${CATEGORIES.length} category pages under cliveuni/learn/`);

// ── Generate Learn page ──
function generateLearnPage() {
  const breadcrumbs = [{ label: 'Learn' }];
  let body = `<div class="container">`;
  body += `<p class="section-label">The Path</p>`;
  body += `<h1 class="view-title">Start here. Build the system. Lead the shift.</h1>`;

  body += `<div class="curriculum-stages">`;
  body += `<div class="stage"><span class="stage-number">1</span><h2 class="stage-heading">Foundations</h2><p>Food cost, labor, inventory. The operating numbers every manager must own.</p></div>`;
  body += `<div class="stage"><span class="stage-number">2</span><h2 class="stage-heading">Leadership</h2><p>Accountability, delegation, culture. The systems that build other managers.</p></div>`;
  body += `<div class="stage"><span class="stage-number">3</span><h2 class="stage-heading">In the Field</h2><p>Clive case studies and location labs. Where the system meets the shift.</p></div>`;
  body += `</div>`;

  body += `<h2 class="category-grid-heading">Eight Categories</h2>`;
  body += `<div class="category-grid">`;

  for (const cat of CATEGORIES) {
    const catModules = modules.filter(m => m.category === cat.id);
    body += `<a href="${esc(cat.id)}/index.html" class="category-card">`;
    body += `<h3>${esc(cat.title)}</h3>`;
    body += `<p>${esc(cat.description)}</p>`;
    body += `<span class="category-meta">${catModules.length} modules</span>`;
    body += `</a>`;
  }

  body += `</div>`;

  // Also show all courses for backward compat
  body += `<h2 class="course-grid-heading">Core Courses</h2>`;
  body += `<div class="course-grid" id="course-grid">`;
  for (const course of courses.courses) {
    const stage = { 'food-cost': 'Foundations', 'labor': 'Foundations', 'inventory': 'Foundations', 'accountability': 'Leadership', 'delegation': 'Leadership', 'leadership': 'Leadership' }[course.domain] || '';
    body += `<a href="../topic/${esc(course.id)}/index.html" class="course-card" data-roles="${esc(course.roles.join(','))}">`;
    body += `<span class="course-icon">${esc(course.icon)}</span>`;
    body += `<div class="course-card-body">`;
    body += `<span class="course-stage-label">${esc(stage)}</span>`;
    body += `<h3>${esc(course.title)}</h3>`;
    body += `<p>${esc(course.subtitle)}</p>`;
    body += `<span class="course-meta">${course.lessons.length} lessons &middot; ${course.quiz.length} questions</span>`;
    body += `</div></a>`;
  }
  body += `</div></div>`;

  const html = pageShell('Learn', breadcrumbs, body, { depth: 1, activeNav: 'learn', description: 'Clive University curriculum — 8 categories, 24+ modules' });
  writeFileSync(join(UNI, 'learn', 'index.html'), html);
}

// ── Generate Stories page ──
function generateStoriesPage() {
  const breadcrumbs = [{ label: 'Stories' }];
  let body = `<div class="container">`;
  body += `<p class="section-label">How Clive Solves Problems</p>`;
  body += `<h1 class="view-title">Challenge. Move. Operating lesson.</h1>`;
  body += `<div class="stories-grid">`;
  for (const cs of caseStudies.caseStudies) {
    body += `<a href="../topic/${esc(cs.id)}/index.html" class="story-card">`;
    if (cs.image) {
      body += `<div class="story-card-image"><img src="../assets/${esc(cs.image)}" alt="${esc(cs.location)}" loading="lazy"></div>`;
    }
    body += `<div class="story-card-body">`;
    body += `<span class="story-location">${esc(cs.location)}</span>`;
    body += `<h3>${esc(cs.title)}</h3>`;
    body += `<p>${esc(cs.challenge.substring(0, 120))}...</p>`;
    body += `</div></a>`;
  }
  body += `</div></div>`;

  const html = pageShell('Stories', breadcrumbs, body, { depth: 1, activeNav: 'stories', description: 'Clive operating stories' });
  writeFileSync(join(UNI, 'stories', 'index.html'), html);
}

// ── Generate Field page ──
function generateFieldPage() {
  const breadcrumbs = [{ label: 'Field' }];
  let body = `<div class="container">`;
  body += `<p class="section-label">Opportunities by Location</p>`;
  body += `<h1 class="view-title">Manager labs for each Clive restaurant</h1>`;
  body += `<div class="location-grid">`;
  for (const lab of fieldGuide.locationLabs) {
    const slug = locationSlug(lab.location);
    body += `<a href="../topic/${esc(slug)}/index.html" class="location-card">`;
    body += `<div class="location-card-body">`;
    body += `<span class="location-label">${esc(lab.label)}</span>`;
    body += `<h3>${esc(lab.location)}</h3>`;
    body += `<p>${esc(lab.focus)}</p>`;
    body += `</div></a>`;
  }
  body += `</div></div>`;

  const html = pageShell('Field', breadcrumbs, body, { depth: 1, activeNav: 'field', description: 'Clive field guide and manager labs' });
  writeFileSync(join(UNI, 'field', 'index.html'), html);
}

// ── Generate Library page ──
function generateLibraryPage() {
  const breadcrumbs = [{ label: 'Library' }];
  let body = `<div class="container">`;
  body += `<p class="section-label">Operating Library</p>`;
  body += `<h1 class="view-title">All modules, tools, and reference</h1>`;

  // All modules by category
  body += `<section class="library-section" aria-label="Modules by category"><h2>Modules</h2>`;
  body += `<div class="library-grid">`;
  for (const mod of modules) {
    const cat = CATEGORY_MAP[mod.category];
    body += `<a href="../topic/${esc(mod.id)}/index.html" class="library-card">`;
    body += `<span class="library-category">${esc(cat.title)}</span>`;
    body += `<h3>${esc(mod.title)}</h3>`;
    body += `<p>${esc(mod.objective)}</p>`;
    body += `<span class="library-meta">${esc(mod.duration)} &middot; ${esc(mod.level)}</span>`;
    body += `</a>`;
  }
  body += `</div></section>`;

  // Tools section
  body += `<section class="library-section" aria-label="Tools and templates"><h2>Tools &amp; Templates</h2>`;
  body += `<div class="library-grid">`;
  for (const tool of fieldGuide.tools) {
    body += `<div class="library-card library-tool-card">`;
    body += `<span class="library-category">${esc(tool.category)}</span>`;
    body += `<h3>${esc(tool.title)}</h3>`;
    body += `</div>`;
  }
  body += `</div></section>`;

  // Articles section
  body += `<section class="library-section" aria-label="Articles"><h2>Articles</h2>`;
  body += `<div class="library-grid">`;
  for (const article of articles.articles) {
    body += `<a href="../topic/${esc(article.id)}/index.html" class="library-card">`;
    body += `<span class="library-category">${esc(article.category)}</span>`;
    body += `<h3>${esc(article.title)}</h3>`;
    body += `<p>${esc(article.dek)}</p>`;
    body += `<span class="library-meta">${esc(article.readingTime)}</span>`;
    body += `</a>`;
  }
  body += `</div></section>`;

  body += `</div>`;

  const html = pageShell('Library', breadcrumbs, body, { depth: 1, activeNav: 'library', description: 'Clive operating library — all modules and reference' });
  writeFileSync(join(UNI, 'library', 'index.html'), html);
}

generateLearnPage();
generateStoriesPage();
generateFieldPage();
generateLibraryPage();

console.log('Generated section index pages: learn, stories, field, library');
console.log(`Total modules: ${modules.length}`);
console.log(`Categories: ${CATEGORIES.map(c => c.id).join(', ')}`);
console.log(`Module IDs: ${modules.map(m => m.id).join(', ')}`);
