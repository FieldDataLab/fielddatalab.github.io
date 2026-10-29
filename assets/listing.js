// Contents page: search, field/tag/month filters, month grouping and pagination.
// Article data comes from _listing.ejs; full article text comes from Quarto's search.json.
(() => {
  const ARTICLES = JSON.parse(decodeURIComponent(document.getElementById('fdl-data').textContent.trim()));
  const PER_PAGE = 10;
  const TOP_N = 5;
  const expanded = { tag: false, field: false };
  const fullText = new Map();

  const $ = id => document.getElementById(id);
  const q = $('q'), list = $('list'), pager = $('pager'), status = $('status'), empty = $('empty'), toggleBtn = $('toggle-all');
  const state = { tag: null, field: null, month: null, page: 1 };
  const openIds = new Set();

  const monthKey = d => d.slice(0, 7);
  const monthName = k => new Date(k + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dayLabel = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const escHTML = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const key = a => a.id || a.href;

  function count(fn) {
    const m = new Map();
    ARTICLES.forEach(a => [].concat(fn(a)).filter(Boolean).forEach(k => m.set(k, (m.get(k) || 0) + 1)));
    return m;
  }

  function buildRail() {
    const byCount = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);
    const groups = [
      ['g-tag', 'tag', [...count(a => a.tags)].sort(byCount), k => k],
      ['g-field', 'field', [...count(a => a.field)].sort(byCount), k => k],
      ['g-month', 'month', [...count(a => monthKey(a.date))].sort((a, b) => b[0].localeCompare(a[0])), monthName]
    ];
    groups.forEach(([gid, kind, items, label]) => {
      const el = $(gid);
      if (!items.length) { el.hidden = true; return; }
      const capped = kind in expanded;
      el.insertAdjacentHTML('beforeend', items.map(([k, n], i) =>
        `<button type="button" data-kind="${kind}" data-value="${escHTML(k)}" aria-pressed="false"${capped && i >= TOP_N ? ' data-extra' : ''}>${escHTML(label(k))} <span class="count">${n}</span></button>`).join(''));
      if (capped && items.length > TOP_N) {
        el.insertAdjacentHTML('beforeend',
          `<button type="button" class="more" data-more="${kind}" data-n="${items.length - TOP_N}" aria-expanded="false"></button>`);
      }
    });
  }

  const terms = () => q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);

  function hl(text, ts) {
    const safe = escHTML(text);
    if (!ts.length) return safe;
    return safe.replace(new RegExp('(' + ts.map(t => escRe(escHTML(t))).join('|') + ')', 'gi'), '<mark>$1</mark>');
  }

  function matches(a, ts) {
    if (state.tag && !a.tags.includes(state.tag)) return false;
    if (state.field && a.field !== state.field) return false;
    if (state.month && monthKey(a.date) !== state.month) return false;
    const hay = [a.title, a.abs, a.kw, a.field, a.id, a.author, ...a.tags, fullText.get(a.href) || ''].join(' ').toLowerCase();
    return ts.every(t => hay.includes(t));
  }

  function entryHTML(a, ts) {
    const absHit = ts.length && ts.some(t => (a.abs + ' ' + a.kw).toLowerCase().includes(t) && !a.title.toLowerCase().includes(t));
    const open = openIds.has(key(a)) || absHit;
    const chips = [a.field, ...a.tags].map((t, i) => t &&
      `<button type="button" class="tag" data-kind="${i ? 'tag' : 'field'}" data-value="${escHTML(t)}">${hl(t, ts)}</button>`).join('');
    const idChip = a.id ? `<span class="label mono">${hl(a.id, ts)}</span>` : '';
    const abstract = a.abs ? `<details class="abstract"${open ? ' open' : ''}>
        <summary>Abstract</summary>
        <p>${hl(a.abs, ts)}${a.kw ? `<span class="kw">Keywords: ${hl(a.kw, ts)}</span>` : ''}</p>
      </details>` : '';
    return `<article class="entry" data-key="${escHTML(key(a))}">
      <h4><a href="${escHTML(a.href)}" target="_blank" rel="noopener">${hl(a.title, ts)}<span class="out" aria-hidden="true">↗</span></a></h4>
      ${a.author ? `<p class="byline">${hl(a.author, ts)}</p>` : ''}
      <div class="meta">${idChip}<span class="label">${dayLabel(a.date)} · ${a.mins} min read</span>${chips}</div>
      ${abstract}
    </article>`;
  }

  function render(scroll) {
    const ts = terms();
    const found = ARTICLES.filter(a => matches(a, ts)).sort((a, b) => b.date.localeCompare(a.date));
    const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
    state.page = Math.min(state.page, pages);
    const slice = found.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

    // Group this page's articles by month
    const byMonth = [];
    slice.forEach(a => {
      const k = monthKey(a.date);
      if (!byMonth.length || byMonth[byMonth.length - 1].k !== k) byMonth.push({ k, items: [] });
      byMonth[byMonth.length - 1].items.push(a);
    });
    list.innerHTML = byMonth.map(g =>
      `<section class="section"><h3 class="label">${monthName(g.k)}</h3>${g.items.map(a => entryHTML(a, ts)).join('')}</section>`).join('');
    list.querySelectorAll('details.abstract').forEach(d => d.addEventListener('toggle', () => {
      const k = d.closest('.entry').dataset.key;
      d.open ? openIds.add(k) : openIds.delete(k);
      syncToggle();
    }));

    const active = [ts.length && `“${q.value.trim()}”`, state.tag, state.field, state.month && monthName(state.month)].filter(Boolean);
    status.hidden = !active.length;
    if (active.length) status.innerHTML = `${found.length} of ${ARTICLES.length} articles match ${escHTML(active.join(' · '))} · <button type="button" class="clear-all">Clear</button>`;

    empty.hidden = found.length > 0;
    empty.innerHTML = ARTICLES.length
      ? 'No articles match. Try a field, a method or a keyword, or <button type="button" id="clear">clear all filters</button>.'
      : 'The first article is on its way.';

    pager.hidden = pages <= 1;
    if (pages > 1) {
      const from = (state.page - 1) * PER_PAGE + 1, to = from + slice.length - 1;
      let nums = '';
      for (let p = 1; p <= pages; p++) nums += `<button type="button" data-page="${p}"${p === state.page ? ' aria-current="page"' : ''}>${p}</button>`;
      pager.innerHTML = `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>← Newer</button>
        <span class="nums">${nums}</span>
        <button type="button" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>Older →</button>
        <span class="range label">${from}–${to} of ${found.length}</span>`;
    }

    document.querySelectorAll('.rail [data-kind]').forEach(b => {
      const on = state[b.dataset.kind] === b.dataset.value;
      b.setAttribute('aria-pressed', String(on));
      // Extra items stay hidden until expanded, unless one is the active filter
      if (b.hasAttribute('data-extra')) b.hidden = !expanded[b.dataset.kind] && !on;
    });
    document.querySelectorAll('.rail [data-more]').forEach(b => {
      const open = expanded[b.dataset.more];
      b.textContent = open ? 'Show fewer' : `+ ${b.dataset.n} more`;
      b.setAttribute('aria-expanded', String(open));
    });
    toggleBtn.hidden = !slice.some(a => a.abs);
    syncToggle();
    if (scroll) $('top').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function syncToggle() {
    const ds = [...list.querySelectorAll('details.abstract')];
    const open = ds.length > 0 && ds.every(d => d.open);
    toggleBtn.textContent = open ? 'Hide all abstracts' : 'Show all abstracts';
    toggleBtn.setAttribute('aria-pressed', String(open));
  }

  function setFilter(kind, value) {
    state[kind] = state[kind] === value ? null : value;
    if (state[kind] && typeof gtag === 'function') gtag('event', 'select_content', { content_type: kind, item_id: value });
    state.page = 1;
    render(false);
  }

  buildRail();
  render(false);

  // Full-text search over article bodies, once Quarto's index has loaded
  fetch('search.json').then(r => r.ok ? r.json() : []).then(rows => {
    rows.forEach(r => {
      const href = String(r.href || '').split('#')[0].replace(/^\//, '');
      fullText.set(href, (fullText.get(href) || '') + ' ' + (r.section || '') + ' ' + (r.text || ''));
    });
    if (terms().length) render(false);
  }).catch(() => {});

  // Report searches and filter clicks to Google Analytics (the search box doesn't change the URL, so GA can't see it otherwise)
  const track = (name, params) => { if (typeof gtag === 'function') gtag('event', name, params); };
  let searchTimer;
  q.addEventListener('input', () => {
    state.page = 1; render(false);
    clearTimeout(searchTimer);
    const term = q.value.trim();
    if (term.length >= 2) searchTimer = setTimeout(() => track('search', { search_term: term }), 1500);
  });
  document.addEventListener('click', ev => {
    const more = ev.target.closest('[data-more]');
    if (more) { expanded[more.dataset.more] = !expanded[more.dataset.more]; render(false); return; }
    const f = ev.target.closest('[data-kind]');
    if (f) { setFilter(f.dataset.kind, f.dataset.value); return; }
    const p = ev.target.closest('#pager [data-page]');
    if (p && !p.disabled) { state.page = Number(p.dataset.page); render(true); return; }
    if (ev.target.closest('#clear, .clear-all')) {
      q.value = ''; state.tag = state.field = state.month = null; state.page = 1;
      render(false); q.focus();
    }
  });
  toggleBtn.addEventListener('click', () => {
    const ds = [...list.querySelectorAll('details.abstract')];
    const open = !ds.every(d => d.open);
    ds.forEach(d => { d.open = open; });
  });
  // Navigation drawer
  const rail = $('rail'), navBtn = $('nav-toggle'), scrim = $('scrim');
  const narrow = () => matchMedia('(max-width: 56rem)').matches;
  function setNav(open, focusSearch) {
    rail.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    navBtn.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => (focusSearch ? q : $('rail-close')).focus(), 60);
    else if (rail.contains(document.activeElement)) navBtn.focus();
  }
  navBtn.addEventListener('click', () => setNav(!rail.classList.contains('open')));
  $('rail-close').addEventListener('click', () => setNav(false));
  scrim.addEventListener('click', () => setNav(false));
  // On small screens the drawer covers the list, so close it once a choice is made
  rail.addEventListener('click', ev => { if (narrow() && ev.target.closest('[data-kind]')) setNav(false); });
  q.addEventListener('keydown', ev => { if (ev.key === 'Enter' && narrow()) setNav(false); });

  // "/" opens search; Escape closes the menu; arriving from an article's Search link opens it too
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && rail.classList.contains('open')) { setNav(false); return; }
    if (ev.key === '/' && document.activeElement !== q) { ev.preventDefault(); setNav(true, true); }
  });
  if (location.hash === '#q') setNav(true, true);
  else if (location.hash === '#menu') setNav(true);
})();
