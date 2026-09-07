(function () {
  const SAMPLE = [
    '*** SYNTHETIC COMMITMENT / SCHEDULE B EXCERPT — NOT A REAL FILE ***',
    '',
    'COMMITMENT FOR TITLE INSURANCE (DEMO)',
    'File No.: DEMO-2026-0841',
    'Commitment Date: (blank on this sample)',
    'Proposed Insured: (see Parties — incomplete)',
    'Property: Lot 12, Block 4, Maple Creek Subdivision, Sample County, ST',
    '',
    'SCHEDULE A (excerpt)',
    '1. Effective Date: ________',
    '2. Policy / Amount: Owner\'s · $________ (amount blank)',
    '3. Title to estate: Fee Simple',
    '4. Vesting: "John Sample" only — spouse / entity chain not stated',
    '5. Legal Description: Lot 12, Block 4, Maple Creek Subdivision…',
    '   (abbrev.; does not match survey call notes below)',
    '',
    'SCHEDULE B — PART I (Requirements) — excerpt omitted for demo',
    '',
    'SCHEDULE B — PART II (Exceptions)',
    '1. Taxes and assessments not yet due and payable.',
    '2. Easements, if any, appearing of record.  ← vague; no instrument / book-page',
    '3. Rights of parties in possession.',
    '4. Survey exception: "any facts which an accurate survey would disclose"',
    '   — blanket survey exception; no ALTA survey referenced.',
    '5. (open list continues — items 6–11 referenced as "see prior commitment"',
    '   but prior commitment not attached to this synthetic excerpt)',
    '',
    'NOTES (examiner scratch — synthetic)',
    '- Legal on Sch. A Lot 12/Block 4; survey memo mentions Lot 12 / Block 3 conflict.',
    '- Commitment date field empty on cover.',
    '- Parties / vesting: single name only; no marital status / entity authority.',
    '',
    '*** END SYNTHETIC DEMO — fake file, fake lot, fake people ***'
  ].join('\n');

  const NONSENSE = 'asdf qwerty banana pizza lorem 12345 hello world this is not a commitment';

  const CHECKS = [
    { id: 'easement', label: 'Easement language specificity', cite: 'Sch. B · easements', hint: 'Named instruments / book-page vs blanket “easements of record”' },
    { id: 'survey', label: 'Survey exception scope', cite: 'Sch. B · survey', hint: 'Blanket survey exception vs survey-referenced exception' },
    { id: 'vesting', label: 'Parties / vesting completeness', cite: 'Sch. A · vesting', hint: 'Named vested parties, marital/entity status cues' },
    { id: 'legal', label: 'Legal description fidelity', cite: 'Sch. A · legal', hint: 'Legal matches survey / plat calls without conflict' },
    { id: 'open_ex', label: 'Open exceptions list completeness', cite: 'Sch. B-II · list', hint: 'Exceptions enumerated; no dangling “see prior” without attach' },
    { id: 'comm_date', label: 'Commitment date present', cite: 'Cover / Sch. A · date', hint: 'Commitment / effective date filled on face' }
  ];

  const RESULTS = {
    easement: { status: 'GAP', note: 'Item 2 is blanket “easements, if any, appearing of record” with no instrument cite. Educational flag for specificity — not an underwriting conclusion.' },
    survey: { status: 'GAP', note: 'Blanket survey exception present; no ALTA/survey reference on this synthetic excerpt.' },
    vesting: { status: 'GAP', note: 'Vesting shows a single synthetic name only; spouse/entity/authority cues absent. Paper-QA prompt, not a vesting opinion.' },
    legal: { status: 'GAP', note: 'Sch. A legal (Block 4) conflicts with examiner scratch note (Block 3). Fidelity flag for recon — not a survey opinion.' },
    open_ex: { status: 'GAP', note: 'Items 6–11 deferred to “see prior commitment” without attachment in this excerpt. Open-list incompleteness flag.' },
    comm_date: { status: 'GAP', note: 'Commitment / effective date fields blank on the synthetic cover and Sch. A.' }
  };

  function classify(text) {
    const t = (text || '').trim();
    if (!t) return 'empty';
    const looksLike =
      /schedule\s*b|commitment for title|proposed insured|easement|vesting|legal description|alta|lot\s+\d+|exceptions/i.test(t);
    if (!looksLike || t.split(/\s+/).length < 12) return 'nonsense';
    return 'commitment';
  }

  function evaluate(text) {
    const t = text || '';
    const out = {};
    Object.keys(RESULTS).forEach(function (k) { out[k] = Object.assign({}, RESULTS[k]); });

    if (/Book\s*\d+|Reception\s*No|Inst(rument)?\s*No|Doc(ument)?\s*#/i.test(t) && /easement/i.test(t)) {
      out.easement = { status: 'PASS', note: 'Easement language appears to cite a recorded instrument (heuristic). Still confirm against SoftPro SoR — paper QA only.' };
    }
    if ((/ALTA/i.test(t) && !/\bno\s+ALTA\b/i.test(t)) || /as[- ]shown[- ]on[- ]survey|survey dated/i.test(t)) {
      out.survey = { status: 'PASS', note: 'Survey-referenced language detected (heuristic). SoftPro stays SoR.' };
    }
    if (/and\s+\w+\s+(husband|wife|spouse)|LLC|as joint tenants|tenants in common|trustee/i.test(t)) {
      out.vesting = { status: 'PASS', note: 'Parties/vesting cues look more complete (heuristic). Not a vesting opinion.' };
    }
    if (/Commitment Date:\s*\d|Effective Date:\s*\d|dated\s+\w+\s+\d{1,2},\s*\d{4}/i.test(t)) {
      out.comm_date = { status: 'PASS', note: 'A commitment/effective date appears present (heuristic).' };
    }
    if (!/see prior commitment/i.test(t) && /SCHEDULE B/i.test(t) && (t.match(/^\s*\d+\./gm) || []).length >= 5) {
      out.open_ex = { status: 'PASS', note: 'Exceptions list looks enumerated without dangling prior-commit deferral (heuristic).' };
    }
    if (/Block\s*4/i.test(t) && !/Block\s*3/i.test(t)) {
      out.legal = { status: 'PASS', note: 'No Block 3/4 conflict detected in pasted text (heuristic). Confirm legal vs survey in SoftPro.' };
    }
    return out;
  }

  const textEl = document.getElementById('commitment');
  const checkList = document.getElementById('checkList');
  const gapList = document.getElementById('gapList');
  const gapSummary = document.getElementById('gapSummary');
  const refuseBox = document.getElementById('refuseBox');
  const fullPreview = document.getElementById('fullPreview');
  const toast = document.getElementById('toast');
  const chips = {
    load: document.querySelector('[data-step="load"]'),
    checklist: document.getElementById('chip2'),
    gaps: document.getElementById('chip3'),
    unlock: document.getElementById('chip4')
  };

  let unlockedSteps = { load: true, checklist: false, gaps: false, unlock: false };

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('on'); }, 1800);
  }

  function go(step) {
    if (!unlockedSteps[step]) return;
    document.querySelectorAll('.demo-card').forEach(function (c) {
      c.classList.toggle('on', c.dataset.card === step);
    });
    document.querySelectorAll('.demo-steps .step-chip').forEach(function (ch) {
      ch.setAttribute('aria-pressed', ch.dataset.step === step ? 'true' : 'false');
    });
    var demo = document.getElementById('demo');
    if (demo) demo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderChecklist() {
    checkList.innerHTML = CHECKS.map(function (c) {
      return '<div class="check-item on" data-id="' + c.id + '">' +
        '<div class="box" aria-hidden="true"></div>' +
        '<div class="label">' + c.label +
        '<span class="cite-hint">' + c.hint + ' · ' + c.cite + '</span></div></div>';
    }).join('');
  }

  function lockedBody(kind, scored) {
    var lines = [
      'TITLE · SCH. B / COMMITMENT EXCEPTION PACK (LOCKED)',
      '====================================================',
      'File: synthetic-commitment-schb-demo.txt',
      'Engine: educational exception / gap checklist',
      'SoR: SoftPro (or your TPS) — this is paper QA only',
      'Human owns Send / Submit · not an underwriter stamp',
      '',
      kind === 'ok'
        ? 'GAP CHIPS (blurred)'
        : 'REFUSE PATH (blurred) — desk held; no invented exceptions'
    ];
    if (scored) {
      lines.push(
        '  · Easement language ............. ' + scored.easement.status,
        '  · Survey exception .............. ' + scored.survey.status,
        '  · Parties / vesting ............. ' + scored.vesting.status,
        '  · Legal description fidelity .... ' + scored.legal.status,
        '  · Open exceptions list .......... ' + scored.open_ex.status,
        '  · Commitment date ............... ' + scored.comm_date.status
      );
    }
    lines.push(
      '',
      'DISCLAIMER (always)',
      '  Educational pack only — NOT legal advice.',
      '  NOT an underwriter stamp / title opinion.',
      '  NOT SoftPro integration / wire movement.',
      '',
      'EXPORT: layout watermarked until unlock · $49/file · mailto'
    );
    return lines.join('\n');
  }

  function runReport() {
    unlockedSteps.checklist = true;
    unlockedSteps.gaps = true;
    unlockedSteps.unlock = true;
    chips.checklist.disabled = false;
    chips.gaps.disabled = false;
    chips.unlock.disabled = false;

    var kind = classify(textEl.value);
    refuseBox.innerHTML = '';
    gapSummary.innerHTML = '';
    gapList.innerHTML = '';

    if (kind === 'empty' || kind === 'nonsense') {
      var title = kind === 'empty' ? 'REFUSE · empty paste' : 'REFUSE · not a commitment';
      var body = kind === 'empty'
        ? 'Nothing to overlay. The desk holds — it does not invent Schedule B exceptions, vesting, or an underwriter stamp. Load the synthetic sample, or paste a real excerpt. Human still owns Send / Submit.'
        : 'This text does not look like a commitment / Sch. B excerpt. TITLE refuses to hallucinate exception chips. Resilience is the feature. Try the sample, or paste commitment language.';
      refuseBox.innerHTML =
        '<div class="refuse-stamp" role="status"><span>' + title + '</span><p>' + body + '</p></div>';
      fullPreview.textContent = lockedBody(kind);
      showToast(kind === 'empty' ? 'REFUSE · empty paste held' : 'REFUSE · nonsense held');
      go('gaps');
      return;
    }

    var scored = evaluate(textEl.value);
    var gaps = 0;
    var passes = 0;
    var rows = CHECKS.map(function (c) {
      var r = scored[c.id];
      if (r.status === 'GAP') gaps++;
      else passes++;
      return Object.assign({}, c, r);
    });

    gapSummary.innerHTML =
      '<div class="stat bad"><b>' + gaps + '</b><span>GAPs</span></div>' +
      '<div class="stat ok"><b>' + passes + '</b><span>PASS</span></div>' +
      '<div class="stat"><b>' + CHECKS.length + '</b><span>Checked</span></div>';

    gapList.innerHTML = rows.map(function (r) {
      return '<div class="gap-row ' + r.status.toLowerCase() + '">' +
        '<div class="gap-head"><strong>' + r.label + '</strong>' +
        '<span class="badge ' + r.status.toLowerCase() + '">' + r.status + '</span></div>' +
        '<span class="cite">' + r.cite + '</span>' +
        '<div class="gap-body">' + r.note + '</div></div>';
    }).join('');

    fullPreview.textContent = lockedBody('ok', scored);
    showToast('Checklist complete · ' + gaps + ' gaps');
    go('gaps');
  }

  function resetDemo(opts) {
    opts = opts || {};
    if (!opts.keepText) textEl.value = '';
    unlockedSteps = { load: true, checklist: false, gaps: false, unlock: false };
    chips.checklist.disabled = true;
    chips.gaps.disabled = true;
    chips.unlock.disabled = true;
    gapList.innerHTML = '';
    gapSummary.innerHTML = '';
    refuseBox.innerHTML = '';
    fullPreview.textContent = '';
    go('load');
  }

  document.getElementById('loadSample').addEventListener('click', function () {
    textEl.value = SAMPLE;
    unlockedSteps.checklist = true;
    chips.checklist.disabled = false;
    showToast('Sample loaded · synthetic');
  });

  document.getElementById('clearText').addEventListener('click', function () {
    textEl.value = '';
    showToast('Excerpt cleared');
  });

  textEl.addEventListener('input', function () {
    if (textEl.value.trim()) {
      unlockedSteps.checklist = true;
      chips.checklist.disabled = false;
    }
  });

  document.getElementById('toChecklist').addEventListener('click', function () {
    unlockedSteps.checklist = true;
    chips.checklist.disabled = false;
    renderChecklist();
    go('checklist');
    if (!textEl.value.trim()) {
      showToast('Empty paste is allowed — run it to see REFUSE');
    }
  });

  document.getElementById('runChecklist').addEventListener('click', runReport);

  function restart() {
    resetDemo();
    showToast('Demo reset');
  }

  document.getElementById('restart').addEventListener('click', restart);
  document.getElementById('btn-break-restart').addEventListener('click', restart);

  document.getElementById('btn-break-empty').addEventListener('click', function () {
    textEl.value = '';
    renderChecklist();
    runReport();
  });

  document.getElementById('btn-break-nonsense').addEventListener('click', function () {
    textEl.value = NONSENSE;
    renderChecklist();
    runReport();
  });

  document.querySelectorAll('[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () { go(btn.dataset.goto); });
  });

  document.querySelectorAll('.demo-steps .step-chip').forEach(function (ch) {
    ch.addEventListener('click', function () { go(ch.dataset.step); });
  });

  renderChecklist();
})();
