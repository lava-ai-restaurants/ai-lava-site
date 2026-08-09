(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     Clive Study Coach — Closed-World Deterministic
     Zero network calls. Zero persistent storage.
     Button-only interaction. All responses from
     embedded CLIVEUNI_MODULE data.
     ══════════════════════════════════════════════ */

  var MODULE = window.CLIVEUNI_MODULE || null;
  if (!MODULE || !MODULE.modes) return;

  var VALID_MODES = { teach: 1, quiz: 1, scenario: 1, apply: 1, checklist: 1, sources: 1 };
  var currentMode = 'teach';
  var quizIndex = 0;
  var teachIndex = 0;

  /* ── Allowlist of all valid action IDs ── */
  var ALLOWED_IDS = new Set();

  /* ── Canonical evidence registry ── */
  var EVIDENCE_REGISTRY = new Set();

  (function buildAllowlistAndRegistry() {
    var m = MODULE.modes;
    if (m.teach && m.teach.steps) {
      m.teach.steps.forEach(function (s) {
        ALLOWED_IDS.add(s.id);
        if (s.evidenceId) EVIDENCE_REGISTRY.add(s.evidenceId);
      });
    }
    if (m.quiz && m.quiz.questions) {
      m.quiz.questions.forEach(function (q) {
        ALLOWED_IDS.add(q.id);
        q.choices.forEach(function (c) { ALLOWED_IDS.add(c.id); });
      });
    }
    if (m.scenario) {
      ALLOWED_IDS.add(m.scenario.id);
      if (m.scenario.choices) m.scenario.choices.forEach(function (c) {
        ALLOWED_IDS.add(c.id);
        if (c.evidenceId) EVIDENCE_REGISTRY.add(c.evidenceId);
      });
    }
    if (m.apply) {
      ALLOWED_IDS.add(m.apply.id);
      if (m.apply.steps) m.apply.steps.forEach(function (s) {
        ALLOWED_IDS.add(s.id);
        if (s.evidenceId) EVIDENCE_REGISTRY.add(s.evidenceId);
      });
    }
    if (m.checklist) {
      ALLOWED_IDS.add(m.checklist.id);
      if (m.checklist.items) m.checklist.items.forEach(function (it) {
        ALLOWED_IDS.add(it.id);
        if (it.evidenceId) EVIDENCE_REGISTRY.add(it.evidenceId);
      });
    }
    if (m.sources) {
      m.sources.forEach(function (s) {
        ALLOWED_IDS.add(s.id);
        if (s.evidenceId) EVIDENCE_REGISTRY.add(s.evidenceId);
      });
    }
  })();

  /* ── Validate action ID ── */
  function isValidAction(actionId) {
    return typeof actionId === 'string' && ALLOWED_IDS.has(actionId);
  }

  /* ── Validate evidence ID against registry ── */
  function isValidEvidenceId(evidenceId) {
    return typeof evidenceId === 'string' && EVIDENCE_REGISTRY.has(evidenceId);
  }

  /* ── URL validation for citations ── */
  var ALLOWED_HOSTS = ['www.youtube.com', 'youtube.com', 'youtu.be', 'weareclive.com', 'www.weareclive.com'];

  function isValidCitationUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (/^\.\.?\//.test(url) || (url.charAt(0) === '/' && url.charAt(1) !== '/')) {
      return !/[\\@]/.test(url);
    }
    if (/^javascript:/i.test(url) || /^data:/i.test(url) || url.indexOf('//') === 0 || /[\\]/.test(url)) return false;
    try {
      var parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;
      if (parsed.username || parsed.password) return false;
      return ALLOWED_HOSTS.indexOf(parsed.hostname) !== -1;
    } catch (e) {
      return false;
    }
  }

  /* ── DOM refs ── */
  var panel = document.getElementById('study-panel');
  var fab = document.getElementById('study-fab');
  var closeBtn = panel ? panel.querySelector('.study-panel-close') : null;
  var messagesEl = document.getElementById('study-messages');
  var actionsEl = document.getElementById('study-actions');
  var resetBtn = document.getElementById('study-reset');
  var modeButtons = panel ? panel.querySelectorAll('.study-mode-btn') : [];

  if (!panel || !fab || !messagesEl || !actionsEl) return;

  /* ── Focusable elements for focus trap ── */
  function getFocusableElements() {
    return panel.querySelectorAll(
      'button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  /* ── Inert management ── */
  function setBackgroundInert(inert) {
    var targets = document.querySelectorAll('main, header, footer, .bottom-nav');
    Array.prototype.forEach.call(targets, function (el) {
      if (inert) {
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
    });
  }

  /* ── Open/Close ── */
  fab.addEventListener('click', function () {
    panel.hidden = false;
    fab.hidden = true;
    document.body.classList.add('study-open');
    setBackgroundInert(true);
    startMode(currentMode);
    if (closeBtn) closeBtn.focus();
  });

  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  function closePanel() {
    panel.hidden = true;
    fab.hidden = false;
    document.body.classList.remove('study-open');
    setBackgroundInert(false);
    fab.focus();
  }

  /* ── Keyboard: document-level Escape ── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) {
      e.preventDefault();
      closePanel();
    }
  });

  /* ── Focus trap ── */
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var focusable = getFocusableElements();
    if (focusable.length === 0) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ── Mode switching ── */
  Array.prototype.forEach.call(modeButtons, function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.dataset.mode;
      if (!VALID_MODES[mode]) return;
      currentMode = mode;
      Array.prototype.forEach.call(modeButtons, function (b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      startMode(mode);
    });
  });

  // Set initial aria-pressed
  Array.prototype.forEach.call(modeButtons, function (btn) {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
  });

  /* ── Reset ── */
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      quizIndex = 0;
      teachIndex = 0;
      clearMessages();
      clearActions();
      startMode(currentMode);
    });
  }

  /* ── Rendering helpers (safe: textContent only) ── */
  function clearMessages() {
    while (messagesEl.firstChild) messagesEl.removeChild(messagesEl.firstChild);
  }

  function clearActions() {
    while (actionsEl.firstChild) actionsEl.removeChild(actionsEl.firstChild);
  }

  function addMessage(text, role, citation, evidenceId) {
    var div = document.createElement('div');
    div.className = 'study-msg study-msg--' + role;
    div.textContent = text;
    // Expose validated evidenceId for auditability
    if (evidenceId && isValidEvidenceId(evidenceId)) {
      div.setAttribute('data-evidence-id', evidenceId);
    }
    if (citation && citation.url && isValidCitationUrl(citation.url)) {
      var citDiv = document.createElement('div');
      citDiv.className = 'study-citations';
      var link = document.createElement('a');
      link.href = citation.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = citation.title || 'Source';
      citDiv.appendChild(link);
      div.appendChild(citDiv);
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addActionButton(id, label, callback) {
    if (!isValidAction(id) && id !== '__nav') return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'study-action-btn';
    btn.dataset.actionId = id;
    btn.textContent = label;
    btn.addEventListener('click', function () {
      callback(id);
    });
    actionsEl.appendChild(btn);
  }

  function addNavButton(label, callback) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'study-action-btn study-action-btn--nav';
    btn.textContent = label;
    btn.addEventListener('click', callback);
    actionsEl.appendChild(btn);
  }

  /* ══════════════════════════════════════
     MODE: TEACH
     Step through evidence blocks
     ══════════════════════════════════════ */
  function startMode(mode) {
    clearMessages();
    clearActions();
    quizIndex = 0;
    teachIndex = 0;

    switch (mode) {
      case 'teach': startTeach(); break;
      case 'quiz': startQuiz(); break;
      case 'scenario': startScenario(); break;
      case 'apply': startApply(); break;
      case 'checklist': startChecklist(); break;
      case 'sources': startSources(); break;
      default: addMessage('Unknown mode. Please select a mode above.', 'coach');
    }
  }

  function startTeach() {
    var teach = MODULE.modes.teach;
    if (!teach) { addMessage('No teaching content available for this module.', 'coach'); return; }
    addMessage(teach.greeting, 'coach', null, teach.evidenceId);
    showTeachStep(0);
  }

  function showTeachStep(index) {
    var teach = MODULE.modes.teach;
    if (!teach || !teach.steps || index >= teach.steps.length) {
      clearActions();
      addMessage('You have completed all lessons in this module. Try Quiz mode to test your understanding.', 'coach');
      addNavButton('Start Quiz', function () {
        currentMode = 'quiz';
        updateModeButtons('quiz');
        startMode('quiz');
      });
      return;
    }

    teachIndex = index;
    var step = teach.steps[index];
    clearActions();

    addMessage(step.title + ': ' + step.content, 'coach', step.citation, step.evidenceId);

    // Follow-up buttons
    if (index + 1 < teach.steps.length) {
      addActionButton(teach.steps[index + 1].id, 'Next: ' + teach.steps[index + 1].title, function () {
        addMessage('Next: ' + teach.steps[index + 1].title, 'user');
        showTeachStep(index + 1);
      });
    }

    if (index > 0) {
      addActionButton(teach.steps[index - 1].id, 'Previous: ' + teach.steps[index - 1].title, function () {
        addMessage('Previous: ' + teach.steps[index - 1].title, 'user');
        showTeachStep(index - 1);
      });
    }

    addNavButton('Start Quiz', function () {
      currentMode = 'quiz';
      updateModeButtons('quiz');
      startMode('quiz');
    });
  }

  /* ══════════════════════════════════════
     MODE: QUIZ
     Knowledge check questions
     ══════════════════════════════════════ */
  function startQuiz() {
    var quiz = MODULE.modes.quiz;
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      addMessage('No quiz questions available for this module.', 'coach');
      return;
    }
    addMessage('Knowledge Check: ' + quiz.questions.length + ' questions. Select your answer for each.', 'coach');
    showQuizQuestion(0);
  }

  function showQuizQuestion(index) {
    var quiz = MODULE.modes.quiz;
    if (!quiz || index >= quiz.questions.length) {
      addMessage('Quiz complete. Review the feedback above and try Scenario mode to apply what you learned.', 'coach');
      clearActions();
      addNavButton('Try Scenario', function () {
        currentMode = 'scenario';
        updateModeButtons('scenario');
        startMode('scenario');
      });
      return;
    }

    quizIndex = index;
    var q = quiz.questions[index];
    addMessage('Question ' + (index + 1) + ': ' + q.question, 'coach', null, q.evidenceId);

    clearActions();
    for (var i = 0; i < q.choices.length; i++) {
      (function (choice, choiceIndex) {
        addActionButton(choice.id, choice.text, function () {
          addMessage(choice.text, 'user', null, choice.evidenceId);
          clearActions();
          var prefix = choice.correct ? 'Correct! ' : 'Not quite. ';
          addMessage(prefix + choice.feedback, 'coach', null, choice.evidenceId);
          // Next question
          if (index + 1 < quiz.questions.length) {
            addNavButton('Next Question', function () {
              showQuizQuestion(index + 1);
            });
          } else {
            addMessage('Quiz complete. Review the feedback above.', 'coach');
            addNavButton('Try Scenario', function () {
              currentMode = 'scenario';
              updateModeButtons('scenario');
              startMode('scenario');
            });
          }
        });
      })(q.choices[i], i);
    }
  }

  /* ══════════════════════════════════════
     MODE: SCENARIO
     Composite scenario with choices — all
     options stay available until exhausted
     ══════════════════════════════════════ */
  function startScenario() {
    var scenario = MODULE.modes.scenario;
    if (!scenario) { addMessage('No scenario available for this module.', 'coach'); return; }
    addMessage(scenario.prompt, 'coach', null, scenario.evidenceId);

    if (scenario.choices) {
      showScenarioChoices(scenario.choices.slice());
    }
  }

  function showScenarioChoices(remaining) {
    clearActions();
    if (remaining.length === 0) {
      addMessage('You have explored all scenario options. Try Apply mode to put this into practice.', 'coach');
      addNavButton('Try Apply Mode', function () {
        currentMode = 'apply';
        updateModeButtons('apply');
        startMode('apply');
      });
      return;
    }

    for (var i = 0; i < remaining.length; i++) {
      (function (choice) {
        addActionButton(choice.id, choice.label, function () {
          addMessage(choice.label, 'user', null, choice.evidenceId);
          addMessage(choice.feedback, 'coach', null, choice.evidenceId);
          var next = remaining.filter(function (c) { return c.id !== choice.id; });
          showScenarioChoices(next);
        });
      })(remaining[i]);
    }
  }

  /* ══════════════════════════════════════
     MODE: APPLY
     Field assignment steps
     ══════════════════════════════════════ */
  function startApply() {
    var apply = MODULE.modes.apply;
    if (!apply) { addMessage('No field assignment available for this module.', 'coach'); return; }
    addMessage('Field Assignment: ' + apply.assignment, 'coach', null, apply.evidenceId);

    if (apply.steps && apply.steps.length > 0) {
      addMessage('Here are the steps to complete this assignment:', 'coach');
      for (var i = 0; i < apply.steps.length; i++) {
        addMessage('Step ' + (i + 1) + ': ' + apply.steps[i].text, 'coach', null, apply.steps[i].evidenceId);
      }
    }

    clearActions();
    addNavButton('View Checklist', function () {
      currentMode = 'checklist';
      updateModeButtons('checklist');
      startMode('checklist');
    });
    addNavButton('View Sources', function () {
      currentMode = 'sources';
      updateModeButtons('sources');
      startMode('sources');
    });
  }

  /* ══════════════════════════════════════
     MODE: CHECKLIST
     Actionable items
     ══════════════════════════════════════ */
  function startChecklist() {
    var checklist = MODULE.modes.checklist;
    if (!checklist || !checklist.items || checklist.items.length === 0) {
      addMessage('No checklist available for this module.', 'coach');
      return;
    }
    addMessage('Operating Checklist for "' + MODULE.title + '":', 'coach', null, checklist.id);
    for (var i = 0; i < checklist.items.length; i++) {
      addMessage((i + 1) + '. ' + checklist.items[i].text, 'coach', null, checklist.items[i].evidenceId);
    }
    clearActions();
    addNavButton('View Sources', function () {
      currentMode = 'sources';
      updateModeButtons('sources');
      startMode('sources');
    });
    addNavButton('Back to Teach', function () {
      currentMode = 'teach';
      updateModeButtons('teach');
      startMode('teach');
    });
  }

  /* ══════════════════════════════════════
     MODE: SOURCES
     Citation list
     ══════════════════════════════════════ */
  function startSources() {
    var sources = MODULE.modes.sources;
    if (!sources || sources.length === 0) {
      addMessage('This module draws from Clive operating examples and frameworks. No external source URLs are available for this content.', 'coach');
      if (MODULE.modes.teach && MODULE.modes.teach.steps) {
        var citedSteps = MODULE.modes.teach.steps.filter(function (s) { return s.citation && s.citation.url; });
        if (citedSteps.length > 0) {
          addMessage('The following lessons have source citations:', 'coach');
          for (var j = 0; j < citedSteps.length; j++) {
            addMessage(citedSteps[j].title, 'coach', citedSteps[j].citation, citedSteps[j].evidenceId);
          }
        }
      }
      clearActions();
      addNavButton('Back to Teach', function () {
        currentMode = 'teach';
        updateModeButtons('teach');
        startMode('teach');
      });
      return;
    }

    addMessage('Sources for "' + MODULE.title + '":', 'coach');
    for (var i = 0; i < sources.length; i++) {
      addMessage(sources[i].title, 'coach', { title: sources[i].title, url: sources[i].url }, sources[i].evidenceId);
    }
    clearActions();
    addNavButton('Back to Teach', function () {
      currentMode = 'teach';
      updateModeButtons('teach');
      startMode('teach');
    });
  }

  /* ── Mode button UI update ── */
  function updateModeButtons(mode) {
    Array.prototype.forEach.call(modeButtons, function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
      btn.setAttribute('aria-pressed', btn.dataset.mode === mode ? 'true' : 'false');
    });
  }
})();
