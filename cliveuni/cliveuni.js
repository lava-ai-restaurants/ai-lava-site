(function () {
  'use strict';

  /* ── State ── */
  const STORAGE_KEY = 'cliveUniversityProgress';
  let coursesData = null;
  let currentCourseId = null;
  let currentView = 'lesson-0';

  /* ── Progress helpers ── */
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function markLessonComplete(courseId, lessonId) {
    const p = loadProgress();
    if (!p[courseId]) p[courseId] = { lessons: [], quizScore: null };
    if (!p[courseId].lessons.includes(lessonId)) {
      p[courseId].lessons.push(lessonId);
    }
    saveProgress(p);
  }

  function markQuizScore(courseId, score, total) {
    const p = loadProgress();
    if (!p[courseId]) p[courseId] = { lessons: [], quizScore: null };
    p[courseId].quizScore = { score, total };
    saveProgress(p);
  }

  function getCourseProgress(courseId, course) {
    const p = loadProgress();
    const cp = p[courseId] || { lessons: [], quizScore: null };
    const totalSteps = course.lessons.length + 1; // lessons + quiz
    let completed = cp.lessons.length;
    if (cp.quizScore) completed += 1;
    return { completed, total: totalSteps, pct: Math.round((completed / totalSteps) * 100), raw: cp };
  }

  /* ── Data fetch ── */
  async function loadCourses() {
    try {
      const base = document.querySelector('script[src*="cliveuni.js"]');
      let jsonUrl = 'courses.json';
      if (base) {
        const src = base.getAttribute('src');
        const dir = src.substring(0, src.lastIndexOf('/') + 1);
        jsonUrl = dir + 'courses.json';
      }
      const resp = await fetch(jsonUrl);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      coursesData = await resp.json();
      renderCourses('all');
      renderFieldwork();
      renderProgressPanel();
      resumeLearning();
    } catch (e) {
      document.getElementById('courses-error').hidden = false;
      document.getElementById('course-grid').innerHTML = '';
    }
  }

  /* ── Render courses ── */
  function renderCourses(role) {
    const grid = document.getElementById('course-grid');
    if (!coursesData) return;
    const courses = coursesData.courses.filter(function (c) {
      if (role === 'all') return true;
      return c.roles.includes(role);
    });

    grid.innerHTML = courses.map(function (c) {
      const prog = getCourseProgress(c.id, c);
      const progressBadge = prog.pct > 0
        ? '<span class="course-card-progress">' + prog.pct + '% complete</span>'
        : '';
      return '<div class="course-card" tabindex="0" role="button" aria-label="Open ' + escapeHtml(c.title) + '" data-course-id="' + c.id + '">' +
        progressBadge +
        '<div class="course-card-icon">' + escapeHtml(c.icon) + '</div>' +
        '<h3>' + escapeHtml(c.title) + '</h3>' +
        '<p>' + escapeHtml(c.subtitle) + '</p>' +
        '<div class="course-card-meta">' +
          '<span>' + c.lessons.length + ' lessons</span>' +
          '<span>' + c.quiz.length + ' quiz questions</span>' +
          '<span>' + c.roles.map(function(r) { return r.replace('-', ' '); }).join(', ') + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    grid.querySelectorAll('.course-card').forEach(function (card) {
      card.addEventListener('click', function () { openCourse(card.dataset.courseId); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCourse(card.dataset.courseId); }
      });
    });
  }

  /* ── Render fieldwork ── */
  function renderFieldwork() {
    const list = document.getElementById('fieldwork-list');
    if (!coursesData) return;
    list.innerHTML = coursesData.courses.map(function (c) {
      return '<div class="fieldwork-card">' +
        '<h4>' + escapeHtml(c.title) + '</h4>' +
        '<p>' + escapeHtml(c.operatingAssignment) + '</p>' +
      '</div>';
    }).join('');
  }

  /* ── Render progress panel ── */
  function renderProgressPanel() {
    const body = document.getElementById('progress-body');
    if (!coursesData) return;
    body.innerHTML = coursesData.courses.map(function (c) {
      const prog = getCourseProgress(c.id, c);
      return '<div class="progress-course">' +
        '<div class="progress-course-title">' + escapeHtml(c.title) + '</div>' +
        '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + prog.pct + '%"></div></div>' +
        '<div class="progress-label">' + prog.completed + ' of ' + prog.total + ' steps' +
          (prog.raw.quizScore ? ' &middot; Quiz: ' + prog.raw.quizScore.score + '/' + prog.raw.quizScore.total : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Resume learning ── */
  function resumeLearning() {
    const p = loadProgress();
    const keys = Object.keys(p);
    if (keys.length === 0) return;
    // Find first incomplete course
    for (let i = 0; i < coursesData.courses.length; i++) {
      const c = coursesData.courses[i];
      const prog = getCourseProgress(c.id, c);
      if (prog.pct > 0 && prog.pct < 100) {
        // Auto-scroll to courses section
        document.getElementById('courses').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  }

  /* ── Open course dialog ── */
  function openCourse(courseId) {
    const course = coursesData.courses.find(function (c) { return c.id === courseId; });
    if (!course) return;
    currentCourseId = courseId;
    currentView = 'lesson-0';

    const dialog = document.getElementById('course-dialog');
    document.getElementById('dialog-title').textContent = course.title;
    document.getElementById('assignment-text').textContent = course.operatingAssignment;

    buildLessonNav(course);
    showLesson(course, 0);
    buildQuiz(course);

    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.dialog-close').focus();
  }

  /* ── Lesson navigation ── */
  function buildLessonNav(course) {
    const nav = document.getElementById('lesson-nav');
    let html = '';
    course.lessons.forEach(function (l, i) {
      html += '<button type="button" class="lesson-tab' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">Lesson ' + (i + 1) + '</button>';
    });
    html += '<button type="button" class="lesson-tab-quiz" data-view="quiz">Quiz</button>';
    nav.innerHTML = html;

    nav.querySelectorAll('.lesson-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = parseInt(btn.dataset.index);
        currentView = 'lesson-' + idx;
        setActiveTab(nav, btn);
        showLesson(course, idx);
        document.getElementById('quiz-section').hidden = true;
      });
    });

    nav.querySelector('.lesson-tab-quiz').addEventListener('click', function () {
      currentView = 'quiz';
      setActiveTab(nav, this);
      document.getElementById('lesson-content').innerHTML = '';
      document.getElementById('source-citation').innerHTML = '';
      document.getElementById('quiz-section').hidden = false;
    });
  }

  function setActiveTab(nav, activeBtn) {
    nav.querySelectorAll('.lesson-tab, .lesson-tab-quiz').forEach(function (b) { b.classList.remove('active'); });
    activeBtn.classList.add('active');
  }

  function showLesson(course, index) {
    const lesson = course.lessons[index];
    if (!lesson) return;

    document.getElementById('lesson-content').innerHTML =
      '<h3>' + escapeHtml(lesson.title) + '</h3>' +
      '<p>' + escapeHtml(lesson.summary) + '</p>';

    const src = lesson.source;
    const provenanceLabel = src.provenance === 'publisher_captions' ? 'Publisher captions' : 'Local speech-to-text';
    document.getElementById('source-citation').innerHTML =
      '<span class="cite-label">Source</span>' +
      '<a href="' + escapeAttr(src.url) + '" target="_blank" rel="noopener">' + escapeHtml(src.title) + '</a>' +
      ' (' + src.startSeconds + 's &ndash; ' + src.endSeconds + 's)' +
      '<span class="cite-provenance">Provenance: ' + provenanceLabel + '</span>';

    markLessonComplete(course.id, lesson.id);
    renderProgressPanel();
    renderCourses(getActiveRole());
  }

  /* ── Quiz ── */
  function buildQuiz(course) {
    const form = document.getElementById('quiz-form');
    const feedback = document.getElementById('quiz-feedback');
    feedback.innerHTML = '';
    let html = '';

    course.quiz.forEach(function (q, qi) {
      html += '<div class="quiz-question" data-qi="' + qi + '">';
      html += '<p>' + (qi + 1) + '. ' + escapeHtml(q.question) + '</p>';
      q.choices.forEach(function (ch, ci) {
        html += '<button type="button" class="quiz-choice" data-qi="' + qi + '" data-ci="' + ci + '">' + escapeHtml(ch) + '</button>';
      });
      html += '</div>';
    });

    html += '<button type="button" class="quiz-submit" id="quiz-submit-btn" disabled>Check Answers</button>';
    form.innerHTML = html;

    const selections = {};
    form.querySelectorAll('.quiz-choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const qi = btn.dataset.qi;
        selections[qi] = parseInt(btn.dataset.ci);
        form.querySelectorAll('.quiz-choice[data-qi="' + qi + '"]').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        const allAnswered = Object.keys(selections).length === course.quiz.length;
        document.getElementById('quiz-submit-btn').disabled = !allAnswered;
      });
    });

    form.querySelector('#quiz-submit-btn').addEventListener('click', function () {
      submitQuiz(course, selections);
    });
  }

  function submitQuiz(course, selections) {
    const feedback = document.getElementById('quiz-feedback');
    let score = 0;
    let html = '';

    course.quiz.forEach(function (q, qi) {
      const selected = selections[qi];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) score++;

      const form = document.getElementById('quiz-form');
      form.querySelectorAll('.quiz-choice[data-qi="' + qi + '"]').forEach(function (btn) {
        const ci = parseInt(btn.dataset.ci);
        if (ci === q.correctIndex) btn.classList.add('correct');
        else if (ci === selected && !isCorrect) btn.classList.add('incorrect');
        btn.disabled = true;
        btn.style.cursor = 'default';
      });

      html += '<div class="quiz-feedback-item ' + (isCorrect ? 'correct' : 'incorrect') + '">';
      html += '<strong>' + (isCorrect ? 'Correct' : 'Incorrect') + ':</strong> ' + escapeHtml(q.explanation);
      html += '</div>';
    });

    html = '<p style="margin-bottom:12px;font-weight:700;">Score: ' + score + ' / ' + course.quiz.length + '</p>' + html;
    feedback.innerHTML = html;

    document.getElementById('quiz-submit-btn').disabled = true;
    markQuizScore(course.id, score, course.quiz.length);
    renderProgressPanel();
    renderCourses(getActiveRole());
  }

  /* ── Role filter ── */
  function getActiveRole() {
    const active = document.querySelector('.role-btn.active');
    return active ? active.dataset.role : 'all';
  }

  /* ── Helpers ── */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── Events ── */
  document.addEventListener('DOMContentLoaded', function () {
    loadCourses();

    // Role filter
    document.querySelectorAll('.role-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.role-btn').forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        renderCourses(btn.dataset.role);
      });
    });

    // Progress panel toggle
    var progressBtn = document.querySelector('.nav-progress-btn');
    var progressPanel = document.getElementById('progress-panel');
    var progressClose = progressPanel.querySelector('.progress-close');

    progressBtn.addEventListener('click', function () {
      var isHidden = progressPanel.hidden;
      progressPanel.hidden = !isHidden;
      progressBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      if (isHidden) progressClose.focus();
    });

    progressClose.addEventListener('click', function () {
      progressPanel.hidden = true;
      progressBtn.setAttribute('aria-expanded', 'false');
      progressBtn.focus();
    });

    // Dialog close
    var dialog = document.getElementById('course-dialog');
    dialog.querySelector('.dialog-close').addEventListener('click', function () {
      dialog.close();
    });

    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        dialog.close();
      }
    });

    dialog.addEventListener('close', function () {
      currentCourseId = null;
      currentView = 'lesson-0';
    });

    // Close progress panel on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !progressPanel.hidden) {
        progressPanel.hidden = true;
        progressBtn.setAttribute('aria-expanded', 'false');
        progressBtn.focus();
      }
    });
  });
})();
