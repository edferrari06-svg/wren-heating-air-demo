/* Wren Heating & Air — portfolio demo.
   No network requests, no storage beyond this browser tab's session, no tracking. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var PHONE_TEL = 'tel:+15555550163';
  var PHONE_TEXT = '(555) 555-0163';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* A polite status region for announcements outside the brief. */
  var pageStatus = document.createElement('p');
  pageStatus.className = 'visually-hidden';
  pageStatus.setAttribute('role', 'status');
  pageStatus.setAttribute('aria-live', 'polite');
  document.body.appendChild(pageStatus);
  function announce(el, msg) {
    el.textContent = '';
    window.setTimeout(function () { el.textContent = msg; }, 60);
  }

  /* ======================================================================
     Season (PRODUCT §8, DESIGN §14)
     The initial season was set in <head> from the device date.
     ====================================================================== */

  var seasonPage = $('.season-page');
  var flip = $('.season-flip');
  var tabs = $all('[data-season-set]');

  function currentSeason() { return root.getAttribute('data-season') === 'cold' ? 'cold' : 'warm'; }

  function sortForSeason(season) {
    $all('[data-season-sort]').forEach(function (list) {
      var items = Array.prototype.filter.call(list.children, function (el) {
        return el.hasAttribute('data-order-' + season);
      });
      items.sort(function (a, b) {
        return Number(a.getAttribute('data-order-' + season)) - Number(b.getAttribute('data-order-' + season));
      });
      items.forEach(function (el) { list.appendChild(el); });
    });
  }

  function syncTabs(season) {
    tabs.forEach(function (tab) {
      tab.setAttribute('aria-pressed', tab.getAttribute('data-season-set') === season ? 'true' : 'false');
    });
  }

  function playFlip() {
    if (!seasonPage || !flip) return;
    if (reduceMotion.matches) {
      seasonPage.classList.remove('is-fading');
      void seasonPage.offsetWidth;
      seasonPage.classList.add('is-fading');
      return;
    }
    var rect = seasonPage.getBoundingClientRect();
    var top = Math.max(0, -rect.top);
    var visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    if (visible <= 0) return; // the season page is off-screen; nothing to show
    flip.style.setProperty('--flip-from', getComputedStyle(seasonPage).backgroundColor);
    flip.style.top = top + 'px';
    flip.style.height = visible + 'px';
    flip.classList.remove('is-flipping');
    void flip.offsetWidth;
    flip.classList.add('is-flipping');
    window.clearTimeout(flipTimer);
    flipTimer = window.setTimeout(function () { flip.classList.remove('is-flipping'); }, 520);
  }
  var flipTimer;
  if (flip) {
    flip.addEventListener('animationend', function () { flip.classList.remove('is-flipping'); });
  }

  function setSeason(season, opts) {
    opts = opts || {};
    var changed = season !== currentSeason();
    if (changed && opts.animate) playFlip();
    root.setAttribute('data-season', season);
    if (opts.manual) {
      root.setAttribute('data-shoulder', 'false');
      try { sessionStorage.setItem('wren-season', season); } catch (e) { /* storage unavailable: fine */ }
    }
    syncTabs(season);
    sortForSeason(season);
    if (changed && opts.announce) {
      announce(pageStatus, season === 'warm' ? 'Showing the warm-season page.' : 'Showing the cold-season page.');
    }
    if (typeof renderBrief === 'function') renderBrief();
  }

  (function initSeason() {
    var stored = null;
    try { stored = sessionStorage.getItem('wren-season'); } catch (e) { stored = null; }
    if (stored === 'warm' || stored === 'cold') {
      setSeason(stored, { manual: true });
    } else {
      setSeason(currentSeason(), {});
    }
  })();

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setSeason(tab.getAttribute('data-season-set'), { manual: true, animate: true, announce: true });
    });
  });

  /* The visitor's own date in the Today square (no network; blank without JS). */
  var todayEl = $('[data-today]');
  if (todayEl) {
    var d = new Date();
    var wd = d.toLocaleDateString('en-US', { weekday: 'short' });
    var mo = d.toLocaleDateString('en-US', { month: 'short' });
    todayEl.textContent = ' ' + wd + ' ' + mo + ' ' + d.getDate();
  }

  /* ======================================================================
     Menu
     ====================================================================== */

  var binding = $('.binding');
  var menuBtn = $('.menu-toggle');
  function setMenu(open) {
    if (!binding || !menuBtn) return;
    binding.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    $all('.site-nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && binding.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', function (mq) { if (mq.matches) setMenu(false); });
  }

  /* ======================================================================
     Request form (PRODUCT §10)
     ====================================================================== */

  var reqForm = $('#request-form');
  var reqSection = $('#request');
  var needSelect = $('#f-need');
  var urgentNote = $('[data-urgent-note]');
  var reqTitle = $('[data-request-title]');
  var doneBox = $('[data-form-done]');
  var errorSummary = $('[data-form-errors]');
  var briefAttachedHint = $('[data-brief-attached]');

  var TITLES = {
    replacement: 'Request an estimate conversation',
    tuneup: 'Request a tune-up'
  };

  function setNeed(need) {
    if (needSelect) needSelect.value = need || '';
    if (reqTitle) reqTitle.textContent = TITLES[need] || 'Request a visit';
    updateUrgentNote();
  }

  function updateUrgentNote() {
    if (!urgentNote || !needSelect) return;
    var v = needSelect.value;
    urgentNote.hidden = !(v === 'no-cooling' || v === 'no-heat');
  }
  if (needSelect) needSelect.addEventListener('change', updateUrgentNote);

  $all('a[data-need]').forEach(function (a) {
    a.addEventListener('click', function () {
      setNeed(a.getAttribute('data-need'));
      if (doneBox && !doneBox.hidden) showForm();
    });
  });

  function fieldError(input, message) {
    var err = $('#' + input.id + '-error');
    if (!err) return;
    if (message) {
      err.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg><span></span>';
      err.lastChild.textContent = message;
      err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', err.id);
    } else {
      err.hidden = true;
      err.textContent = '';
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }

  function validate() {
    var problems = [];
    var name = $('#f-name'), phone = $('#f-phone'), email = $('#f-email');

    if (!name.value.trim()) { fieldError(name, 'Please enter your name.'); problems.push(name); }
    else fieldError(name, '');

    var digits = phone.value.replace(/\D/g, '');
    if (!phone.value.trim()) { fieldError(phone, 'Please enter a phone number so we could call you back.'); problems.push(phone); }
    else if (digits.length < 10) { fieldError(phone, 'Please include the area code, for example (555) 555-0100.'); problems.push(phone); }
    else fieldError(phone, '');

    if (!needSelect.value) { fieldError(needSelect, 'Please choose what you need. “Something else” is fine.'); problems.push(needSelect); }
    else fieldError(needSelect, '');

    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      fieldError(email, 'That email address looks incomplete. Leave it blank if you prefer.');
      problems.push(email);
    } else fieldError(email, '');

    return problems;
  }

  function showForm() {
    reqForm.hidden = false;
    doneBox.hidden = true;
  }

  if (reqForm) {
    reqForm.addEventListener('submit', function (e) {
      e.preventDefault(); // Portfolio demo: nothing is ever transmitted.
      var problems = validate();
      if (problems.length) {
        errorSummary.hidden = false;
        errorSummary.innerHTML = '';
        var lead = document.createElement('p');
        lead.textContent = problems.length === 1
          ? 'One thing needs fixing before this can be noted:'
          : problems.length + ' things need fixing before this can be noted:';
        var list = document.createElement('ul');
        problems.forEach(function (field) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + field.id;
          a.textContent = document.querySelector('label[for="' + field.id + '"]').firstChild.textContent.trim();
          a.addEventListener('click', function (ev) { ev.preventDefault(); field.focus(); });
          li.appendChild(a);
          list.appendChild(li);
        });
        errorSummary.appendChild(lead);
        errorSummary.appendChild(list);
        problems[0].focus();
        return;
      }
      errorSummary.hidden = true;
      reqForm.hidden = true;
      doneBox.hidden = false;
      doneBox.focus();
    });

    // Clear an error as soon as it's fixed.
    $all('input, select', reqForm).forEach(function (el) {
      el.addEventListener('blur', function () {
        if (el.getAttribute('aria-invalid') === 'true') validate();
      });
    });
  }

  var resetBtn = $('[data-form-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      reqForm.reset();
      if (briefAttachedHint) briefAttachedHint.hidden = true;
      setNeed('');
      showForm();
      $('#f-name').focus();
    });
  }

  /* ======================================================================
     Comfort Brief — "How's the house?" (PRODUCT §9, DESIGN §11)
     Records what the homeowner says. Never diagnoses, scores or predicts.
     ====================================================================== */

  var briefForm = $('#brief-form');
  var stepTwo = $('#step-two');
  var slip = $('#slip');
  var slipEmpty = $('[data-slip-empty]');
  var slipLines = $('[data-slip-lines]');
  var slipTold = $('[data-slip-told]');
  var slipSkipped = $('[data-slip-skipped]');
  var slipNext = $('[data-slip-next]');
  var nextText = $('[data-next-text]');
  var nextCare = $('[data-next-care]');
  var nextAction = $('[data-next-action]');
  var slipQuestions = $('[data-slip-questions]');
  var slipActions = $('[data-slip-actions]');
  var briefStatus = $('[data-brief-status]');
  var lastAnnounced = '';
  var lastStepKey = '';
  var lastStepKind = '';

  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  var T = {
    state: {
      cooling: 'The house isn’t cooling.',
      heating: 'The house isn’t heating.',
      rooms: 'The system runs, but some rooms are never comfortable.',
      off: 'The system works, but something seems off.',
      planning: 'Nothing’s wrong right now. Planning ahead.'
    },
    offWhat: {
      noise: 'A new or loud noise', water: 'Water near the indoor unit', smell: 'A smell that isn’t gas',
      cycling: 'It turns on and off a lot', bills: 'Energy bills are up', other: 'Something else, or not sure'
    },
    plan: {
      replacement: 'Replacing the system', heatpump: 'A heat pump', tuneup: 'A tune-up',
      iaq: 'Better air quality', thermostat: 'A new thermostat', notsure: 'Not sure yet'
    },
    since: { today: 'Today', days: 'A few days ago', weeks: 'Weeks or longer ago', notsure: 'Not sure' },
    people: { children: 'young children', older: 'older adults', medical: 'someone with medical needs', pets: 'pets', none: 'No one in particular' },
    priorities: { upfront: 'up-front cost', bills: 'monthly bills', even: 'even comfort', quiet: 'a quieter system', air: 'air quality', reliable: 'fewer breakdowns' },
    system: { furnace: 'Furnace and AC', heatpump: 'Heat pump', boiler: 'Boiler', notsure: 'Not sure of the type' },
    age: { under10: 'Under 10 years (homeowner’s estimate)', '10to15': '10–15 years (homeowner’s estimate)', over15: 'Over 15 years (homeowner’s estimate)', notsure: 'Not sure' },
    repairs: { no: 'None', once: 'Once', more: 'More than once', notsure: 'Not sure' },
    checks: {
      mode: 'thermostat mode and setting', power: 'thermostat power or batteries', vents: 'vents and returns are open',
      filter: 'looked at the filter', breaker: 'noticed a tripped breaker (left it alone)', none: 'Nothing yet'
    }
  };

  function radioVal(name) {
    var el = briefForm.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function checkVals(name) {
    return $all('input[name="' + name + '"]:checked', briefForm).map(function (el) { return el.value; });
  }
  function groupVisible(state, group) {
    return (group.getAttribute('data-show') || '').split(' ').indexOf(state) !== -1;
  }
  function listText(values, map) {
    var words = values.map(function (v) { return map[v]; });
    if (words.length <= 1) return words.join('');
    return words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
  }
  function capital(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function readBrief() {
    var state = radioVal('state');
    var shown = {};
    $all('.group[data-show]', briefForm).forEach(function (g) {
      var name = (g.querySelector('input') || {}).name;
      if (name) shown[name] = !!state && groupVisible(state, g);
    });
    function r(n) { return shown[n] ? radioVal(n) : ''; }
    function c(n) { return shown[n] ? checkVals(n) : []; }
    return {
      state: state,
      offWhat: r('offWhat'),
      plan: r('plan'),
      since: r('since'),
      people: c('people'),
      priorities: c('priorities'),
      system: r('system'),
      age: r('age'),
      repairs: r('repairs'),
      checks: c('checks'),
      shown: shown
    };
  }

  /* Fixed, transparent rules (PRODUCT §9). Uncertainty leans toward calling. */
  function nextStep(b) {
    var vulnerable = b.people.length && b.people.indexOf('none') === -1;
    var hot = b.state === 'cooling';
    if (b.state === 'cooling' || b.state === 'heating') {
      return {
        kind: 'call',
        text: vulnerable
          ? 'Call us now, and read this note out. With someone at home who’s especially affected by the ' + (hot ? 'heat' : 'cold') + ', please don’t wait.'
          : 'Call us now, and read this note out. It covers what we’d ask first.',
        care: vulnerable
          ? 'If anyone feels unwell from the ' + (hot ? 'heat' : 'cold') + ', get them to a ' + (hot ? 'cooler' : 'warmer') + ' safe place and contact medical help or 911 as needed.'
          : '',
        need: hot ? 'no-cooling' : 'no-heat',
        alt: 'You can also send it with a request.'
      };
    }
    if (b.state === 'off') {
      if (b.offWhat === 'water' || b.offWhat === 'noise') {
        return {
          kind: 'call',
          text: (b.offWhat === 'water' ? 'Water near the equipment' : 'A sudden or loud new noise') + ' is worth talking through now. Call us, and please don’t open the unit.',
          need: 'off', alt: 'Or send it with a request.'
        };
      }
      if (b.offWhat === 'smell' || b.offWhat === 'cycling' || b.offWhat === 'bills') {
        return {
          kind: 'request',
          text: 'Request a visit so someone can take a proper look. If it gets worse, or you’re unsure, call instead.',
          need: 'off', label: 'Request a visit', alt: 'or call'
        };
      }
      return {
        kind: 'call',
        text: 'When something’s hard to put into words, a quick call is the easiest way. Read out what you have.',
        need: 'off', alt: 'Or send it with a request.'
      };
    }
    if (b.state === 'rooms') {
      return {
        kind: 'request',
        text: 'Request a visit. Rooms that never feel right deserve a proper look, and it can be planned around you.',
        need: 'rooms', label: 'Request a visit', alt: 'or call'
      };
    }
    if (b.state === 'planning') {
      if (b.plan === 'replacement' || b.plan === 'heatpump') {
        return {
          kind: 'request', questions: true,
          text: 'Request an estimate conversation. Take this note and the questions below to any company you talk to.',
          need: 'replacement', label: 'Request an estimate conversation', alt: 'or call'
        };
      }
      if (b.plan === 'tuneup') {
        return { kind: 'request', text: 'Request a tune-up, ideally before the season you need the system most.', need: 'tuneup', label: 'Request a tune-up', alt: 'or call' };
      }
      if (b.plan === 'iaq') {
        return { kind: 'request', text: 'Request a visit to talk about the air in the house.', need: 'iaq', label: 'Request a visit', alt: 'or call' };
      }
      if (b.plan === 'thermostat') {
        return { kind: 'request', text: 'Request a visit about the thermostat and controls.', need: 'thermostat', label: 'Request a visit', alt: 'or call' };
      }
      return { kind: 'request', text: 'Request a visit, and we’ll talk through the options with you.', need: 'other', label: 'Request a visit', alt: 'or call' };
    }
    return null;
  }

  function buildLines(b) {
    var lines = [['Right now', T.state[b.state]]];
    if (b.shown.offWhat) lines.push(['What seems off', b.offWhat ? T.offWhat[b.offWhat] : '']);
    if (b.shown.plan) lines.push(['Planning', b.plan ? T.plan[b.plan] : '']);
    if (b.shown.since) lines.push(['Started', b.since ? T.since[b.since] : '']);
    if (b.shown.people) {
      var p = '';
      if (b.people.indexOf('none') !== -1) p = T.people.none;
      else if (b.people.length) p = capital(listText(b.people, T.people));
      lines.push(['Especially affected at home', p]);
    }
    if (b.shown.priorities) lines.push(['What matters most', b.priorities.length ? capital(listText(b.priorities, T.priorities)) : '']);
    if (b.shown.system) lines.push(['System', b.system ? T.system[b.system] : '']);
    if (b.shown.age) lines.push(['Age', b.age ? T.age[b.age] : '']);
    if (b.shown.repairs) lines.push(['Recent repairs', b.repairs ? T.repairs[b.repairs] : '']);
    if (b.shown.checks) {
      var c = '';
      if (b.checks.indexOf('none') !== -1) c = T.checks.none;
      else if (b.checks.length) c = capital(listText(b.checks, T.checks));
      lines.push(['Already checked', c]);
    }
    return lines;
  }

  function plainText(b, lines, step) {
    var out = ['How’s the house? — comfort brief', '(Wren Heating & Air portfolio demo. Not a diagnosis.)', ''];
    lines.forEach(function (l) { if (l[1]) out.push(l[0] + ': ' + l[1]); });
    if (step) { out.push(''); out.push('Next step: ' + step.text); if (step.care) out.push(step.care); }
    return out.join('\n');
  }

  var current = { brief: null, lines: [], step: null };

  function renderBrief() {
    if (!briefForm) return;
    var b = readBrief();

    // Show only the step-2 questions that apply.
    if (b.state) stepTwo.hidden = false;
    $all('.group[data-show]', briefForm).forEach(function (g) { g.hidden = !b.state || !groupVisible(b.state, g); });

    if (!b.state) {
      slipEmpty.hidden = false;
      slipTold.hidden = slipNext.hidden = slipQuestions.hidden = slipActions.hidden = true;
      current = { brief: null, lines: [], step: null };
      lastStepKey = lastStepKind = '';
      return;
    }

    var lines = buildLines(b);
    var step = nextStep(b);
    current = { brief: b, lines: lines, step: step };

    slipEmpty.hidden = true;
    slipTold.hidden = false;
    slipLines.innerHTML = '';
    var skipped = 0;
    lines.forEach(function (l) {
      if (!l[1]) { skipped++; return; } // unanswered optional details stay off the note
      var wrap = document.createElement('div');
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = l[0];
      dd.textContent = l[1];
      wrap.appendChild(dt); wrap.appendChild(dd);
      slipLines.appendChild(wrap);
    });
    slipSkipped.hidden = skipped === 0;
    slipSkipped.textContent = 'Optional questions you skip are left off the note.';

    var stepKey = step.kind + '|' + step.text + '|' + (step.care || '');
    var stepChanged = lastStepKey !== '' && stepKey !== lastStepKey;
    var becameCall = step.kind === 'call' && lastStepKind !== 'call';
    lastStepKey = stepKey;

    slipNext.hidden = false;
    nextText.textContent = step.text;
    nextCare.hidden = !step.care;
    nextCare.textContent = step.care || '';
    nextAction.innerHTML = '';

    if (step.kind === 'call') {
      // The ring appears in the brief only on a Call recommendation (DESIGN §6).
      var ringed = document.createElement('span');
      ringed.className = 'ringed';
      ringed.innerHTML = '<svg class="ring' + (becameCall ? ' ring--draw' : '') + '" aria-hidden="true" preserveAspectRatio="none"><use href="#i-ring"/></svg>';
      var call = document.createElement('a');
      call.className = 'btn btn--pen';
      call.href = PHONE_TEL;
      call.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-phone"/></svg><span></span>';
      call.lastChild.textContent = 'Call ' + PHONE_TEXT;
      ringed.appendChild(call);
      nextAction.appendChild(ringed);
      if (step.alt) {
        var alt = document.createElement('p');
        alt.className = 'alt screen-only';
        alt.textContent = step.alt;
        nextAction.appendChild(alt);
      }
    } else {
      var req = document.createElement('button');
      req.type = 'button';
      req.className = 'btn btn--pencil';
      req.textContent = step.label;
      req.addEventListener('click', sendToRequest);
      nextAction.appendChild(req);
      var altCall = document.createElement('p');
      altCall.className = 'alt screen-only';
      altCall.appendChild(document.createTextNode('or call '));
      var a = document.createElement('a');
      a.href = PHONE_TEL;
      a.textContent = PHONE_TEXT;
      altCall.appendChild(a);
      nextAction.appendChild(altCall);
    }

    slipQuestions.hidden = !step.questions;
    slipActions.hidden = false;
    lastStepKind = step.kind;
    if (stepChanged) replay(slipNext, 'is-updated');

    var msg = 'Brief updated. Next step: ' + (step.kind === 'call' ? 'call us.' : step.label + '.');
    if (msg !== lastAnnounced) { lastAnnounced = msg; announce(briefStatus, msg); }
  }

  function sendToRequest() {
    if (!current.brief) return;
    var b = current.brief;
    setNeed(current.step ? current.step.need : '');
    var sys = [];
    if (b.system) sys.push(T.system[b.system]);
    if (b.age) sys.push(b.age === 'notsure' ? 'age not known' : T.age[b.age].replace(' (homeowner’s estimate)', ''));
    if (sys.length) $('#f-system').value = sys.join(', ');
    $('#f-details').value = plainText(b, current.lines, current.step);
    if (briefAttachedHint) briefAttachedHint.hidden = false;
    if (doneBox && !doneBox.hidden) showForm();
    reqSection.scrollIntoView({ behavior: 'instant', block: 'start' });
    reqSection.focus({ preventScroll: true });
    var panel = $('.request__panel');
    if (panel) replay(panel, 'is-arrived');
    announce(pageStatus, 'Your brief was added to the request form. Nothing is sent.');
  }

  if (briefForm) {
    briefForm.addEventListener('change', function (e) {
      var t = e.target;

      // "No one in particular" / "Nothing yet" clear the rest of their group, and vice versa.
      if (t.type === 'checkbox') {
        var group = $all('input[name="' + t.name + '"]', briefForm);
        if (t.hasAttribute('data-exclusive') && t.checked) {
          group.forEach(function (el) { if (el !== t) el.checked = false; });
        } else if (t.checked) {
          group.forEach(function (el) { if (el.hasAttribute('data-exclusive')) el.checked = false; });
        }
      }

      // "Up to two" priorities.
      var limited = t.closest('[data-max]');
      if (limited) {
        var max = Number(limited.getAttribute('data-max'));
        var boxes = $all('input', limited);
        var count = boxes.filter(function (x) { return x.checked; }).length;
        boxes.forEach(function (x) { x.disabled = !x.checked && count >= max; });
        var note = limited.parentNode.querySelector('[data-limit-note]');
        if (note) note.hidden = count < max;
      }

      renderBrief();
    });

    briefForm.addEventListener('reset', function () {
      window.setTimeout(function () {
        $all('input', briefForm).forEach(function (x) { x.disabled = false; });
        var note = $('[data-limit-note]', briefForm);
        if (note) note.hidden = true;
        stepTwo.hidden = true;
        lastAnnounced = '';
        renderBrief();
        var first = $('input[name="state"]', briefForm);
        if (first) first.focus();
      }, 0);
    });
  }

  if (slipActions) {
    slipActions.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn || !current.brief) return;
      var action = btn.getAttribute('data-action');
      if (action === 'send') sendToRequest();
      if (action === 'copy') copyBrief(btn);
      if (action === 'print') {
        root.classList.add('printing-brief');
        window.print();
      }
    });
    window.addEventListener('afterprint', function () { root.classList.remove('printing-brief'); });
  }

  function copyBrief(btn) {
    var text = plainText(current.brief, current.lines, current.step);
    function done(ok) {
      var label = btn.querySelector('span');
      label.textContent = ok ? 'Copied' : 'Couldn’t copy';
      btn.classList.add('is-done');
      announce(briefStatus, ok ? 'Brief copied.' : 'Copying isn’t available in this browser. You can select the text instead.');
      lastAnnounced = '';
      window.setTimeout(function () { label.textContent = 'Copy'; btn.classList.remove('is-done'); }, 2200);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
    } else {
      done(fallbackCopy(text));
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  renderBrief();

  /* ======================================================================
     Mobile action bar (PRODUCT §10, DESIGN §16)
     Hides while the request form is on screen, while typing, and whenever
     it would sit on top of the safety rail.
     ====================================================================== */

  var bar = $('.action-bar');
  var rail = $('#rail');
  var hideFor = { form: false, typing: false, rail: false };

  function syncBar() {
    if (!bar) return;
    bar.classList.toggle('is-hidden', hideFor.form || hideFor.typing || hideFor.rail);
  }

  if (bar && 'IntersectionObserver' in window) {
    var formWatch = new IntersectionObserver(function (entries) {
      hideFor.form = entries[0].isIntersecting;
      syncBar();
    }, { threshold: 0 });
    var panel = $('.request__panel');
    if (panel) formWatch.observe(panel);

    var railWatch = null;
    function watchRail() {
      if (railWatch) railWatch.disconnect();
      if (!rail) return;
      var barZone = 96;
      railWatch = new IntersectionObserver(function (entries) {
        hideFor.rail = entries[0].isIntersecting;
        syncBar();
      }, { rootMargin: '-' + Math.max(0, window.innerHeight - barZone) + 'px 0px 0px 0px', threshold: 0 });
      railWatch.observe(rail);
    }
    watchRail();
    var resizeTimer;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(watchRail, 150);
    });
  }

  document.addEventListener('focusin', function (e) {
    if (e.target.matches && e.target.matches('input[type="text"], input[type="tel"], input[type="email"], textarea, select')) {
      hideFor.typing = true; syncBar();
    }
  });
  document.addEventListener('focusout', function () {
    window.setTimeout(function () {
      var a = document.activeElement;
      hideFor.typing = !!(a && a.matches && a.matches('input[type="text"], input[type="tel"], input[type="email"], textarea, select'));
      syncBar();
    }, 0);
  });

})();
