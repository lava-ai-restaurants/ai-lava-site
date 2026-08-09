(function () {
  'use strict';

  /* ── Constants ── */
  var STORAGE_KEY = 'cliveUniversityProgress';
  var MISSION_KEY = 'cliveShiftbookMission';
  var VIEWS = ['today', 'learn', 'stories', 'field', 'library'];
  var VIEW_TITLES = {
    today: 'Today — Clive University',
    learn: 'Learn — Clive University',
    stories: 'Stories — Clive University',
    field: 'Field — Clive University',
    library: 'Library — Clive University'
  };

  /* ── DNA Principles ── */
  var DNA_PRINCIPLES = [
    'The manager arrives with the number, the cause, and the fix.',
    'Unknown stays unknown until the data exists.',
    'Accountability requires structure, not just expectation.',
    'A report that looks complete but cannot be verified is worse than no report at all.',
    'Process corrections are not about blame; they are about finding a repeatable procedure.',
    'When foundational systems are in place, it changes your world.'
  ];

  /* ── State ── */
  var coursesData = null;
  var articlesData = null;
  var caseStudiesData = null;
  var fieldGuideData = null;
  var currentCourseId = null;
  var currentView = 'lesson-0';
  var activeView = 'today';

  /* ── Stage mapping ── */
  var stageMap = {
    'food-cost': 'Foundations',
    'labor': 'Foundations',
    'inventory': 'Foundations',
    'accountability': 'Leadership',
    'delegation': 'Leadership',
    'leadership': 'Leadership'
  };

  /* ═══════════════════════════════════════
     PROGRESS HELPERS
     ═══════════════════════════════════════ */
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

  /* ═══════════════════════════════════════
     MISSION PROGRESS (Today view)
     ═══════════════════════════════════════ */
  function loadMissionProgress() {
    try {
      return JSON.parse(localStorage.getItem(MISSION_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveMissionStep(step) {
    var m = loadMissionProgress();
    m[step] = true;
    localStorage.setItem(MISSION_KEY, JSON.stringify(m));
  }

  function clearMissionProgress() {
    localStorage.removeItem(MISSION_KEY);
  }

  function resetTodayUI() {
    clearMissionProgress();
    var steps = document.querySelectorAll('.mission-step');
    steps.forEach(function (el) {
      el.classList.remove('completed');
      var toggle = el.querySelector('.step-toggle');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        var checkEl = el.querySelector('.step-check');
        if (checkEl) checkEl.setAttribute('aria-label', 'Not completed');
      }
      var content = el.querySelector('.step-content');
      if (content) content.hidden = true;
    });
  }

  /* ═══════════════════════════════════════
     VIEW NAVIGATION
     ═══════════════════════════════════════ */
  function switchView(viewName) {
    if (VIEWS.indexOf(viewName) === -1) viewName = 'today';
    activeView = viewName;

    VIEWS.forEach(function (v) {
      var el = document.getElementById('view-' + v);
      if (el) {
        if (v === viewName) {
          el.hidden = false;
          el.classList.add('view-active');
        } else {
          el.hidden = true;
          el.classList.remove('view-active');
        }
      }
    });

    // Update document title
    document.title = VIEW_TITLES[viewName] || 'Clive University';

    // Update nav active states
    document.querySelectorAll('[data-view]').forEach(function (link) {
      if (link.dataset.view === viewName) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Scroll to top
    window.scrollTo(0, 0);

    // Focus management
    var viewEl = document.getElementById('view-' + viewName);
    if (viewEl) {
      var heading = viewEl.querySelector('h1');
      if (heading) heading.setAttribute('tabindex', '-1');
    }
  }

  function handleHash() {
    var hash = location.hash.replace('#', '') || 'today';
    switchView(hash);
  }

  /* ═══════════════════════════════════════
     DATA FETCH
     ═══════════════════════════════════════ */
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

      renderToday();
      renderCourses('all');
      renderStoryIndex();
      renderLocationSelector();
      renderLibrary('articles-lib');
    } catch (e) {
      var errorEl = document.getElementById('courses-error');
      if (errorEl) errorEl.hidden = false;
    }
  }

  /* ═══════════════════════════════════════
     TODAY VIEW
     ═══════════════════════════════════════ */
  function renderToday() {
    // Set date
    var dateEl = document.getElementById('today-date');
    if (dateEl) {
      var now = new Date();
      var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-US', opts);
    }

    // Set DNA principle (rotate by day of year)
    var dnaEl = document.getElementById('dna-principle');
    if (dnaEl) {
      var dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      var principle = DNA_PRINCIPLES[dayOfYear % DNA_PRINCIPLES.length];
      var bq = dnaEl.querySelector('blockquote');
      if (bq) bq.textContent = principle;
    }

    // Populate step content
    if (coursesData && coursesData.courses.length > 0) {
      renderLearnStep();
    }
    if (caseStudiesData && caseStudiesData.caseStudies.length > 0) {
      renderSeeStep();
    }
    if (fieldGuideData && fieldGuideData.locationLabs.length > 0) {
      renderRunStep();
    }

    // Restore completed state
    var mission = loadMissionProgress();
    ['learn', 'see', 'run'].forEach(function (step) {
      if (mission[step]) {
        var stepEl = document.querySelector('.mission-step[data-step="' + step + '"]');
        if (stepEl) {
          stepEl.classList.add('completed');
          var checkEl = stepEl.querySelector('.step-check');
          if (checkEl) checkEl.setAttribute('aria-label', 'Completed');
        }
      }
    });
    openFirstIncompleteMissionStep(mission);
  }

  function openFirstIncompleteMissionStep(mission) {
    var stepOrder = ['learn', 'see', 'run'];
    var nextStep = stepOrder.find(function (step) { return !mission[step]; }) || 'learn';
    var stepEl = document.querySelector('.mission-step[data-step="' + nextStep + '"]');
    if (!stepEl) return;
    var toggle = stepEl.querySelector('.step-toggle');
    var content = stepEl.querySelector('.step-content');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (content) content.hidden = false;
  }

  function renderLearnStep() {
    var body = document.getElementById('step-learn-body');
    if (!body || !coursesData) return;
    // Pick first course, first lesson as today's lesson
    var course = coursesData.courses[0];
    var lesson = course.lessons[0];
    var src = lesson.source;
    var provenanceLabel = src.provenance === 'publisher_captions' ? 'Publisher captions' : 'Local speech-to-text';

    body.innerHTML =
      '<h4>' + escapeHtml(lesson.title) + '</h4>' +
      '<p>' + escapeHtml(lesson.summary) + '</p>' +
      '<div class="step-citation">' +
        '<a href="' + escapeAttr(src.url) + '" target="_blank" rel="noopener">' + escapeHtml(src.title) + '</a>' +
        ' (' + src.startSeconds + 's\u2013' + src.endSeconds + 's)' +
        '<br><small>Provenance: ' + provenanceLabel + '</small>' +
      '</div>' +
      '<button type="button" class="step-complete-btn" data-step="learn">Mark complete</button>';

    body.querySelector('.step-complete-btn').addEventListener('click', function () {
      completeStep('learn');
    });
  }

  function renderSeeStep() {
    var body = document.getElementById('step-see-body');
    if (!body || !caseStudiesData) return;
    var cs = caseStudiesData.caseStudies[0];

    body.innerHTML =
      '<p class="step-case-label">Situation</p>' +
      '<p>' + escapeHtml(cs.challenge) + '</p>' +
      '<p class="step-case-label">Move</p>' +
      '<p>' + escapeHtml(cs.move) + '</p>' +
      '<p class="step-case-label">DNA</p>' +
      '<p>' + escapeHtml(cs.lesson) + '</p>' +
      '<p class="step-provenance">' + escapeHtml(cs.provenance) + '</p>' +
      '<button type="button" class="step-complete-btn" data-step="see">Mark complete</button>';

    body.querySelector('.step-complete-btn').addEventListener('click', function () {
      completeStep('see');
    });
  }

  function renderRunStep() {
    var body = document.getElementById('step-run-body');
    if (!body || !fieldGuideData) return;
    var lab = fieldGuideData.locationLabs[0];

    body.innerHTML =
      '<h4>' + escapeHtml(lab.location) + '</h4>' +
      '<p>' + escapeHtml(lab.prompt) + '</p>' +
      '<div class="step-deliverable">' +
        '<strong>Deliverable</strong>' + escapeHtml(lab.deliverable) +
      '</div>' +
      '<button type="button" class="step-complete-btn" data-step="run">Mark complete</button>';

    body.querySelector('.step-complete-btn').addEventListener('click', function () {
      completeStep('run');
    });
  }

  function completeStep(step) {
    saveMissionStep(step);
    var stepEl = document.querySelector('.mission-step[data-step="' + step + '"]');
    if (stepEl) {
      stepEl.classList.add('completed');
      var checkEl = stepEl.querySelector('.step-check');
      if (checkEl) checkEl.setAttribute('aria-label', 'Completed');
    }
  }

  /* ═══════════════════════════════════════
     LEARN VIEW — Courses
     ═══════════════════════════════════════ */
  function renderCourses(role) {
    var grid = document.getElementById('course-grid');
    if (!coursesData || !grid) return;
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

  /* ═══════════════════════════════════════
     STORIES VIEW — Index + Reader
     ═══════════════════════════════════════ */
  function renderStoryIndex() {
    var index = document.getElementById('story-index');
    if (!caseStudiesData || !index) return;

    index.innerHTML = caseStudiesData.caseStudies.map(function (cs, i) {
      return '<div class="story-index-item" tabindex="0" role="button" aria-label="Read ' + escapeHtml(cs.title) + '" data-story-index="' + i + '">' +
        '<div class="story-index-location">' + escapeHtml(cs.location) + '</div>' +
        '<div class="story-index-title">' + escapeHtml(cs.title) + '</div>' +
      '</div>';
    }).join('');

    index.querySelectorAll('.story-index-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var idx = parseInt(item.dataset.storyIndex, 10);
        selectStory(idx);
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var idx = parseInt(item.dataset.storyIndex, 10);
          selectStory(idx);
        }
      });
    });
  }

  function selectStory(idx) {
    var cs = caseStudiesData.caseStudies[idx];
    if (!cs) return;

    // On mobile, open dialog
    if (window.innerWidth <= 760) {
      openStoryDialog(cs);
      return;
    }

    // On desktop, show in reader panel
    var reader = document.getElementById('story-reader');
    var imageHtml = '';
    if (cs.image) {
      imageHtml = '<div class="story-image"><img src="assets/' + escapeAttr(cs.image) + '" alt="' + escapeAttr(cs.location) + ' restaurant" loading="lazy"></div>';
    }

    var foodSafetyHtml = '';
    if (cs.id === 'americano-meatball-method') {
      foodSafetyHtml = '<div class="story-food-safety">Approved time-and-temperature and food-safety standards govern all preparation procedures.</div>';
    }

    reader.innerHTML =
      '<div class="story-reader-active">' +
        imageHtml +
        '<div class="story-location-label">' + escapeHtml(cs.location) + '</div>' +
        '<h3>' + escapeHtml(cs.title) + '</h3>' +
        '<p class="story-beat-label">Situation</p>' +
        '<p class="story-beat">' + escapeHtml(cs.challenge) + '</p>' +
        '<p class="story-beat-label">Move</p>' +
        '<p class="story-beat">' + escapeHtml(cs.move) + '</p>' +
        '<p class="story-beat-label dna-beat">DNA</p>' +
        '<p class="story-beat">' + escapeHtml(cs.lesson) + '</p>' +
        foodSafetyHtml +
        '<div class="story-take">Take it to your shift: ' + escapeHtml(cs.lesson) + '</div>' +
        '<p class="story-provenance">' + escapeHtml(cs.provenance) + '</p>' +
      '</div>';

    // Update active state in index
    document.querySelectorAll('.story-index-item').forEach(function (item, i) {
      if (i === idx) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  function openStoryDialog(cs) {
    var dialog = document.getElementById('story-dialog');
    if (!dialog) return;

    document.getElementById('story-dialog-title').textContent = cs.title;

    var imageHtml = '';
    if (cs.image) {
      imageHtml = '<div class="story-image"><img src="assets/' + escapeAttr(cs.image) + '" alt="' + escapeAttr(cs.location) + '" loading="lazy" style="width:100%;height:200px;object-fit:cover;border-radius:4px;margin-bottom:20px;"></div>';
    }

    var foodSafetyHtml = '';
    if (cs.id === 'americano-meatball-method') {
      foodSafetyHtml = '<div class="story-food-safety">Approved time-and-temperature and food-safety standards govern all preparation procedures.</div>';
    }

    document.getElementById('story-dialog-body').innerHTML =
      imageHtml +
      '<p class="story-beat-label" style="margin-top:0;">' + escapeHtml(cs.location) + '</p>' +
      '<p class="story-beat-label">Situation</p>' +
      '<p class="story-beat">' + escapeHtml(cs.challenge) + '</p>' +
      '<p class="story-beat-label">Move</p>' +
      '<p class="story-beat">' + escapeHtml(cs.move) + '</p>' +
      '<p class="story-beat-label dna-beat">DNA</p>' +
      '<p class="story-beat">' + escapeHtml(cs.lesson) + '</p>' +
      foodSafetyHtml +
      '<p class="story-provenance">' + escapeHtml(cs.provenance) + '</p>';

    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.story-dialog-close').focus();
  }

  /* ═══════════════════════════════════════
     FIELD VIEW — Location Selector + Detail
     ═══════════════════════════════════════ */
  function renderLocationSelector() {
    var selector = document.getElementById('location-selector');
    if (!fieldGuideData || !selector) return;

    selector.innerHTML = fieldGuideData.locationLabs.map(function (lab, i) {
      return '<button type="button" class="location-tab" role="tab" aria-selected="false" data-loc-index="' + i + '">' +
        escapeHtml(lab.location) +
      '</button>';
    }).join('');

    selector.querySelectorAll('.location-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var idx = parseInt(tab.dataset.locIndex, 10);
        selectLocation(idx);
      });
    });
    selectLocation(0);
  }

  function selectLocation(idx) {
    var lab = fieldGuideData.locationLabs[idx];
    if (!lab) return;

    var detail = document.getElementById('location-detail');

    // Find related course if any
    var courseLink = '';
    if (coursesData) {
      var relatedDomain = lab.focus.toLowerCase().indexOf('food cost') !== -1 ? 'food-cost' :
        lab.focus.toLowerCase().indexOf('labor') !== -1 ? 'labor' :
        lab.focus.toLowerCase().indexOf('inventory') !== -1 ? 'inventory' :
        lab.focus.toLowerCase().indexOf('accountability') !== -1 ? 'accountability' :
        lab.focus.toLowerCase().indexOf('delegation') !== -1 ? 'delegation' : '';
      if (relatedDomain) {
        var rc = coursesData.courses.find(function (c) { return c.domain === relatedDomain; });
        if (rc) {
          courseLink = '<div class="lab-detail-links"><a href="#learn" data-view="learn">Related course: ' + escapeHtml(rc.title) + ' &rarr;</a></div>';
        }
      }
    }

    detail.innerHTML =
      '<div class="lab-detail">' +
        '<div class="lab-detail-name">' + escapeHtml(lab.location) + '</div>' +
        '<span class="lab-detail-label">' + escapeHtml(lab.label) + '</span>' +
        '<div class="lab-detail-focus">' + escapeHtml(lab.focus) + '</div>' +
        '<p class="lab-detail-prompt">' + escapeHtml(lab.prompt) + '</p>' +
        '<div class="lab-detail-deliverable"><strong>Deliverable</strong>' + escapeHtml(lab.deliverable) + '</div>' +
        courseLink +
      '</div>';

    // Update selector active state
    document.querySelectorAll('.location-tab').forEach(function (tab, i) {
      if (i === idx) {
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.setAttribute('aria-selected', 'false');
      }
    });

    // Bind course links
    detail.querySelectorAll('[data-view]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        location.hash = link.dataset.view;
      });
    });
  }

  /* ═══════════════════════════════════════
     LIBRARY VIEW
     ═══════════════════════════════════════ */
  function renderLibrary(section) {
    var content = document.getElementById('library-content');
    if (!content) return;
    var html = '';

    if (section === 'articles-lib' && articlesData) {
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
    } else if (section === 'courses-lib' && coursesData) {
      html = coursesData.courses.map(function (c) {
        var stage = stageMap[c.domain] || '';
        return '<div class="library-item" tabindex="0" role="button" data-course-id="' + c.id + '">' +
          '<span class="library-item-category">' + escapeHtml(stage) + '</span>' +
          '<div class="library-item-title">' + escapeHtml(c.title) + '</div>' +
          '<div class="library-item-meta">' + c.lessons.length + ' lessons \u00B7 ' + c.quiz.length + ' questions</div>' +
        '</div>';
      }).join('');
    } else if (section === 'assignments-lib' && coursesData) {
      html = coursesData.courses.map(function (c) {
        return '<div class="library-item">' +
          '<div class="library-item-title">' + escapeHtml(c.title) + '</div>' +
          '<div class="library-item-meta">' + escapeHtml(c.operatingAssignment) + '</div>' +
        '</div>';
      }).join('');
    }

    content.innerHTML = html;

    // Bind clicks
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

  /* ═══════════════════════════════════════
     COURSE DIALOG
     ═══════════════════════════════════════ */
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
    renderCourses(getActiveRole());
  }

  /* ═══════════════════════════════════════
     ARTICLE DIALOG
     ═══════════════════════════════════════ */
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
      provenance.appendChild(document.createTextNode(' \u00B7 '));
      provenance.appendChild(sourceLink);
    }

    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.article-dialog-close').focus();
  }

  /* ═══════════════════════════════════════
     TOOL DIALOG
     ═══════════════════════════════════════ */
  function openTool(toolId) {
    var tool = fieldGuideData.tools.find(function (t) { return t.id === toolId; });
    if (!tool) return;

    var dialog = document.getElementById('tool-dialog');
    var body = document.getElementById('tool-dialog-body');
    // Clear previous content safely
    while (body.firstChild) body.removeChild(body.firstChild);
    // Render tool content via textContent to avoid innerHTML XSS
    var title = document.createElement('h3');
    title.textContent = tool.title;
    body.appendChild(title);
    var cat = document.createElement('p');
    cat.textContent = tool.category;
    cat.className = 'tool-instruction';
    body.appendChild(cat);
    // Render the reviewed structured schema with explicit DOM APIs only.
    (tool.blocks || []).forEach(function (block) {
      var element;
      if (block.type === 'paragraph') {
        element = document.createElement('p');
        element.className = block.style === 'footer' ? 'tool-footer' : 'tool-instruction';
        element.textContent = block.text;
      } else if (block.type === 'heading') {
        element = document.createElement('h4');
        element.textContent = block.text;
      } else if (block.type === 'field') {
        element = document.createElement('div');
        var label = document.createElement('h4');
        label.textContent = block.label;
        var value = document.createElement('p');
        value.className = 'tool-field';
        value.textContent = block.value;
        element.appendChild(label);
        element.appendChild(value);
      } else if (block.type === 'list') {
        element = document.createElement(block.ordered ? 'ol' : 'ul');
        (block.items || []).forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          element.appendChild(li);
        });
      } else if (block.type === 'table') {
        element = document.createElement('table');
        element.className = 'tool-table';
        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        (block.headers || []).forEach(function (heading) {
          var th = document.createElement('th');
          th.textContent = heading;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        element.appendChild(thead);
        var tbody = document.createElement('tbody');
        (block.rows || []).forEach(function (row) {
          var tr = document.createElement('tr');
          row.forEach(function (cell) {
            var td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        element.appendChild(tbody);
      }
      if (element) body.appendChild(element);
    });
    dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.tool-dialog-close').focus();
  }

  /* ═══════════════════════════════════════
     ROLE FILTER
     ═══════════════════════════════════════ */
  function getActiveRole() {
    var active = document.querySelector('.role-btn.active');
    return active ? active.dataset.role : 'all';
  }

  /* ═══════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════ */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ═══════════════════════════════════════
     EVENT SETUP
     ═══════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    // Hash navigation
    handleHash();
    window.addEventListener('hashchange', handleHash);

    // Nav link clicks
    document.querySelectorAll('[data-view]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (link.tagName === 'A' && link.getAttribute('href').charAt(0) === '#') {
          e.preventDefault();
          var view = link.dataset.view;
          location.hash = view;
        }
      });
    });

    // Mission step toggles
    document.querySelectorAll('.step-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var content = document.getElementById(btn.getAttribute('aria-controls'));
        if (!content) return;
        var isExpanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        content.hidden = isExpanded;
      });
    });

    // Reset button
    var resetBtn = document.getElementById('reset-progress-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetTodayUI();
      });
    }

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

    // Dialog close handlers
    setupDialogClose('course-dialog', '.dialog-close');
    setupDialogClose('article-dialog', '.article-dialog-close');
    setupDialogClose('tool-dialog', '.tool-dialog-close');
    setupDialogClose('story-dialog', '.story-dialog-close');

    // Load data
    loadAllData();
  });

  function setupDialogClose(dialogId, closeSelector) {
    var dialog = document.getElementById(dialogId);
    if (!dialog) return;

    var closeBtn = dialog.querySelector(closeSelector);
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        dialog.close();
      });
    }

    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { dialog.close(); }
    });

    if (dialogId === 'course-dialog') {
      dialog.addEventListener('close', function () {
        currentCourseId = null;
        currentView = 'lesson-0';
      });
    }
  }
})();
