(function () {
  'use strict';

  /* ── State ── */
  var STORAGE_KEY = 'cliveUniversityProgress';
  var coursesData = null;
  var articlesData = null;
  var caseStudiesData = null;
  var fieldGuideData = null;
  var currentCourseId = null;
  var currentView = 'lesson-0';

  /* ── Progress helpers ── */
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function markLessonComplete(courseId, lessonId) {
    var p = loadProgress();
    if (!p[courseId]) p[courseId] = { lessons: [], quizScore: null };
    if (!p[courseId].lessons.includes(lessonId)) {
      p[courseId].lessons.push(lessonId);
    }
    saveProgress(p);
  }

  function markQuizScore(courseId, score, total) {
    var p = loadProgress();
    if (!p[courseId]) p[courseId] = { lessons: [], quizScore: null };
    p[courseId].quizScore = { score: score, total: total };
    saveProgress(p);
  }

  function getCourseProgress(courseId, course) {
    var p = loadProgress();
    var cp = p[courseId] || { lessons: [], quizScore: null };
    var totalSteps = course.lessons.length + 1;
    var completed = cp.lessons.length;
    if (cp.quizScore) completed += 1;
    return { completed: completed, total: totalSteps, pct: Math.round((completed / totalSteps) * 100), raw: cp };
  }

  /* ── Data fetch ── */
  function resolveUrl(filename) {
    var base = document.querySelector('script[src*="cliveuni.js"]');
    if (base) {
      var src = base.getAttribute('src');
      var dir = src.substring(0, src.lastIndexOf('/') + 1);
      return dir + filename;
    }
    return filename;
  }

  async function loadAllData() {
    try {
      var results = await Promise.all([
        fetch(resolveUrl('courses.json')).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
        fetch(resolveUrl('articles.json')).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
        fetch(resolveUrl('case-studies.json')).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
        fetch(resolveUrl('field-guide.json')).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      ]);
      coursesData = results[0];
      articlesData = results[1];
      caseStudiesData = results[2];
      fieldGuideData = results[3];

      renderCourses('all');
      renderFieldwork();
      renderProgressPanel();
      renderArticles();
      renderCaseStudies();
      renderLocationLabs();
      renderLibrary('courses-lib');
      resumeLearning();
    } catch (e) {
      var errorEl = document.getElementById('courses-error');
      if (errorEl) errorEl.hidden = false;
      var gridEl = document.getElementById('course-grid');
      if (gridEl) gridEl.innerHTML = '';
    }
  }

  /* ── Stage mapping ── */
  var stageMap = {
    'food-cost': 'Foundations',
    'labor': 'Foundations',
    'inventory': 'Foundations',
    'accountability': 'Leadership',
    'delegation': 'Leadership',
    'leadership': 'Leadership'
  };

  /* ── Render courses ── */
  function renderCourses(role) {
    var grid = document.getElementById('course-grid');
    if (!coursesData) return;
    var courses = coursesData.courses.filter(function (c) {
      if (role === 'all') return true;
      return c.roles.includes(role);
    });

    grid.innerHTML = courses.map(function (c) {
      var prog = getCourseProgress(c.id, c);
      var progressBadge = prog.pct > 0
        ? '<span class="course-card-progress">' + prog.pct + '% complete</span>'
        : '';
      var stage = stageMap[c.domain] || '';
      return '<div class="course-card" tabindex="0" role="button" aria-label="Open ' + escapeHtml(c.title) + '" data-course-id="' + c.id + '">' +
        progressBadge +
        '<span class="course-card-stage">' + escapeHtml(stage) + '</span>' +
        '<h3>' + escapeHtml(c.title) + '</h3>' +
        '<p>' + escapeHtml(c.subtitle) + '</p>' +
        '<div class="course-card-meta">' +
          '<span>' + c.lessons.length + ' lessons</span>' +
          '<span>' + c.quiz.length + ' quiz questions</span>' +
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

  /* ── Render articles ── */
  function renderArticles() {
    var shelf = document.getElementById('articles-shelf');
    if (!articlesData) return;
    shelf.innerHTML = articlesData.articles.map(function (a) {
      return '<div class="article-item" tabindex="0" role="button" aria-label="Read ' + escapeHtml(a.title) + '" data-article-id="' + a.id + '">' +
        '<div>' +
          '<div class="article-title">' + escapeHtml(a.title) + '</div>' +
          '<div class="article-dek">' + escapeHtml(a.dek) + '</div>' +
        '</div>' +
        '<div class="article-meta">' +
          escapeHtml(a.category) +
          '<span class="article-meta-time">' + escapeHtml(a.readingTime) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    shelf.querySelectorAll('.article-item').forEach(function (item) {
      item.addEventListener('click', function () { openArticle(item.dataset.articleId); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArticle(item.dataset.articleId); }
      });
    });
  }

  /* ── Open article dialog ── */
  function openArticle(articleId) {
    var article = articlesData.articles.find(function (a) { return a.id === articleId; });
    if (!article) return;

    var dialog = document.getElementById('article-dialog');
    document.getElementById('article-dialog-title').textContent = article.title;
    document.getElementById('article-dialog-meta').textContent = article.category + ' \u00B7 ' + article.readingTime;
    document.getElementById('article-dialog-body').textContent = article.body;

    var takeawaysHtml = '<h4>Takeaways</h4><ul>' +
      article.takeaways.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') +
      '</ul>';
    document.getElementById('article-dialog-takeaways').innerHTML = takeawaysHtml;
    var provenance = document.getElementById('article-dialog-provenance');
    provenance.textContent = article.provenance + (article.sourceNote ? ' \u2014 ' + article.sourceNote : '');
    if (article.sourceUrl) {
      var sourceLink = document.createElement('a');
      sourceLink.href = article.sourceUrl;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener noreferrer';
      sourceLink.textContent = 'Watch source segment';
      provenance.appendChild(document.createTextNode(' · '));
      provenance.appendChild(sourceLink);
    }

    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.article-dialog-close').focus();
  }

  /* ── Render case studies ── */
  function renderCaseStudies() {
    var list = document.getElementById('case-studies-list');
    if (!caseStudiesData) return;
    list.innerHTML = caseStudiesData.caseStudies.map(function (cs) {
      var hasImage = cs.image && cs.image.length > 0;
      var imageHtml = hasImage
        ? '<div class="case-study-image"><img src="assets/' + escapeAttr(cs.image) + '" alt="' + escapeAttr(cs.location) + ' restaurant" loading="lazy"></div>'
        : '';
      return '<div class="case-study' + (hasImage ? ' case-study-with-image' : '') + '">' +
        '<div class="case-study-content">' +
          '<div class="case-study-location">' + escapeHtml(cs.location) + '</div>' +
          '<h3>' + escapeHtml(cs.title) + '</h3>' +
          '<p class="case-study-label">Challenge</p>' +
          '<p>' + escapeHtml(cs.challenge) + '</p>' +
          '<p class="case-study-label">Move</p>' +
          '<p>' + escapeHtml(cs.move) + '</p>' +
          '<p class="case-study-label">Operating Lesson</p>' +
          '<p>' + escapeHtml(cs.lesson) + '</p>' +
          '<p class="case-study-provenance">' + escapeHtml(cs.provenance) + '</p>' +
        '</div>' +
        imageHtml +
      '</div>';
    }).join('');
  }

  /* ── Render location labs ── */
  function renderLocationLabs() {
    var grid = document.getElementById('location-labs-grid');
    if (!fieldGuideData) return;
    grid.innerHTML = fieldGuideData.locationLabs.map(function (lab) {
      return '<div class="location-lab">' +
        '<div class="location-lab-name">' + escapeHtml(lab.location) + '</div>' +
        '<span class="location-lab-label">' + escapeHtml(lab.label) + '</span>' +
        '<div class="location-lab-focus">' + escapeHtml(lab.focus) + '</div>' +
        '<p class="location-lab-prompt">' + escapeHtml(lab.prompt) + '</p>' +
        '<div class="location-lab-deliverable"><strong>Deliverable</strong>' + escapeHtml(lab.deliverable) + '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Render operating library ── */
  function renderLibrary(section) {
    var content = document.getElementById('library-content');
    if (!coursesData) return;
    var html = '';

    if (section === 'courses-lib') {
      html = coursesData.courses.map(function (c) {
        var stage = stageMap[c.domain] || '';
        return '<div class="library-item" tabindex="0" role="button" data-course-id="' + c.id + '">' +
          '<span class="library-item-category">' + escapeHtml(stage) + '</span>' +
          '<div class="library-item-title">' + escapeHtml(c.title) + '</div>' +
          '<div class="library-item-meta">' + c.lessons.length + ' lessons \u00B7 ' + c.quiz.length + ' questions</div>' +
        '</div>';
      }).join('');
    } else if (section === 'articles-lib' && articlesData) {
      html = articlesData.articles.map(function (a) {
        return '<div class="library-item" tabindex="0" role="button" data-article-id="' + a.id + '">' +
          '<span class="library-item-category">' + escapeHtml(a.category) + '</span>' +
          '<div class="library-item-title">' + escapeHtml(a.title) + '</div>' +
          '<div class="library-item-meta">' + escapeHtml(a.readingTime) + '</div>' +
        '</div>';
      }).join('');
    } else if (section === 'tools-lib' && fieldGuideData) {
      html = fieldGuideData.tools.map(function (t) {
        return '<div class="library-item" tabindex="0" role="button" data-tool-id="' + t.id + '">' +
          '<span class="library-item-category">' + escapeHtml(t.category) + '</span>' +
          '<div class="library-item-title">' + escapeHtml(t.title) + '</div>' +
          '<div class="library-item-meta">Printable template</div>' +
        '</div>';
      }).join('');
    } else if (section === 'assignments-lib') {
      html = coursesData.courses.map(function (c) {
        return '<div class="library-item">' +
          '<div class="library-item-title">' + escapeHtml(c.title) + '</div>' +
          '<div class="library-item-meta">' + escapeHtml(c.operatingAssignment) + '</div>' +
        '</div>';
      }).join('');
    }

    content.innerHTML = html;

    content.querySelectorAll('[data-course-id]').forEach(function (item) {
      item.addEventListener('click', function () { openCourse(item.dataset.courseId); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCourse(item.dataset.courseId); }
      });
    });
    content.querySelectorAll('[data-article-id]').forEach(function (item) {
      item.addEventListener('click', function () { openArticle(item.dataset.articleId); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArticle(item.dataset.articleId); }
      });
    });
    content.querySelectorAll('[data-tool-id]').forEach(function (item) {
      item.addEventListener('click', function () { openTool(item.dataset.toolId); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTool(item.dataset.toolId); }
      });
    });
  }

  /* ── Open tool dialog ── */
  function openTool(toolId) {
    var tool = fieldGuideData.tools.find(function (t) { return t.id === toolId; });
    if (!tool) return;

    var dialog = document.getElementById('tool-dialog');
    document.getElementById('tool-dialog-body').innerHTML = tool.content;
    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.tool-dialog-close').focus();
  }

  /* ── Render fieldwork ── */
  function renderFieldwork() {
    var list = document.getElementById('fieldwork-list');
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
    var body = document.getElementById('progress-body');
    if (!coursesData) return;
    body.innerHTML = coursesData.courses.map(function (c) {
      var prog = getCourseProgress(c.id, c);
      return '<div class="progress-course">' +
        '<div class="progress-course-title">' + escapeHtml(c.title) + '</div>' +
        '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + prog.pct + '%"></div></div>' +
        '<div class="progress-label">' + prog.completed + ' of ' + prog.total + ' steps' +
          (prog.raw.quizScore ? ' \u00B7 Quiz: ' + prog.raw.quizScore.score + '/' + prog.raw.quizScore.total : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Resume learning ── */
  function resumeLearning() {
    var p = loadProgress();
    var keys = Object.keys(p);
    if (keys.length === 0) return;
    for (var i = 0; i < coursesData.courses.length; i++) {
      var c = coursesData.courses[i];
      var prog = getCourseProgress(c.id, c);
      if (prog.pct > 0 && prog.pct < 100) {
        document.getElementById('courses').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  }

  /* ── Open course dialog ── */
  function openCourse(courseId) {
    var course = coursesData.courses.find(function (c) { return c.id === courseId; });
    if (!course) return;
    currentCourseId = courseId;
    currentView = 'lesson-0';

    var dialog = document.getElementById('course-dialog');
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
    var nav = document.getElementById('lesson-nav');
    var html = '';
    course.lessons.forEach(function (l, i) {
      html += '<button type="button" class="lesson-tab' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">Lesson ' + (i + 1) + '</button>';
    });
    html += '<button type="button" class="lesson-tab-quiz" data-view="quiz">Quiz</button>';
    nav.innerHTML = html;

    nav.querySelectorAll('.lesson-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.index, 10);
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
    var lesson = course.lessons[index];
    if (!lesson) return;

    document.getElementById('lesson-content').innerHTML =
      '<h3>' + escapeHtml(lesson.title) + '</h3>' +
      '<p>' + escapeHtml(lesson.summary) + '</p>';

    var src = lesson.source;
    var provenanceLabel = src.provenance === 'publisher_captions' ? 'Publisher captions' : 'Local speech-to-text';
    document.getElementById('source-citation').innerHTML =
      '<span class="cite-label">Source</span>' +
      '<a href="' + escapeAttr(src.url) + '" target="_blank" rel="noopener">' + escapeHtml(src.title) + '</a>' +
      ' (' + src.startSeconds + 's \u2013 ' + src.endSeconds + 's)' +
      '<span class="cite-provenance">Provenance: ' + provenanceLabel + '</span>';

    markLessonComplete(course.id, lesson.id);
    renderProgressPanel();
    renderCourses(getActiveRole());
  }

  /* ── Quiz ── */
  function buildQuiz(course) {
    var form = document.getElementById('quiz-form');
    var feedback = document.getElementById('quiz-feedback');
    feedback.innerHTML = '';
    var html = '';

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

    var selections = {};
    form.querySelectorAll('.quiz-choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qi = btn.dataset.qi;
        selections[qi] = parseInt(btn.dataset.ci, 10);
        form.querySelectorAll('.quiz-choice[data-qi="' + qi + '"]').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        var allAnswered = Object.keys(selections).length === course.quiz.length;
        document.getElementById('quiz-submit-btn').disabled = !allAnswered;
      });
    });

    form.querySelector('#quiz-submit-btn').addEventListener('click', function () {
      submitQuiz(course, selections);
    });
  }

  function submitQuiz(course, selections) {
    var feedback = document.getElementById('quiz-feedback');
    var score = 0;
    var html = '';

    course.quiz.forEach(function (q, qi) {
      var selected = selections[qi];
      var isCorrect = selected === q.correctIndex;
      if (isCorrect) score++;

      var form = document.getElementById('quiz-form');
      form.querySelectorAll('.quiz-choice[data-qi="' + qi + '"]').forEach(function (btn) {
        var ci = parseInt(btn.dataset.ci, 10);
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
    var active = document.querySelector('.role-btn.active');
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
    loadAllData();

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

    // Library tabs
    document.querySelectorAll('.library-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.library-tab').forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        renderLibrary(tab.dataset.lib);
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

    // Course dialog close
    var courseDialog = document.getElementById('course-dialog');
    courseDialog.querySelector('.dialog-close').addEventListener('click', function () {
      courseDialog.close();
    });
    courseDialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { courseDialog.close(); }
    });
    courseDialog.addEventListener('close', function () {
      currentCourseId = null;
      currentView = 'lesson-0';
    });

    // Article dialog close
    var articleDialog = document.getElementById('article-dialog');
    articleDialog.querySelector('.article-dialog-close').addEventListener('click', function () {
      articleDialog.close();
    });
    articleDialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { articleDialog.close(); }
    });

    // Tool dialog close
    var toolDialog = document.getElementById('tool-dialog');
    toolDialog.querySelector('.tool-dialog-close').addEventListener('click', function () {
      toolDialog.close();
    });
    toolDialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { toolDialog.close(); }
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
