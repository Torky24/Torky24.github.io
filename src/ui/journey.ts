import { site, research, writing } from '../content';
import { esc, inline, shown, range, statusLabel, statusClass, fmtDate } from '../util';
import type { ResearchEntry, TimelineItem } from '../types';

const P = site.person;
const C = site.chapters;

export const NAV = [
  { id: 'home', n: '00', label: 'Home', on: true },
  { id: 'about', n: C.about.number, label: C.about.label, on: site.sections.about },
  { id: 'research', n: C.research.number, label: C.research.label, on: site.sections.research },
  { id: 'writing', n: C.writing.number, label: C.writing.label, on: site.sections.writing },
].filter((x) => x.on);

const ICONS: Record<string, string> = {
  home: 'M2 13h12M4 13V7h2v6M10 13V7h2v6M6 5h4v1H6zM7 2h2v2H7z',
  about: 'M6 3h4v4H6zM4 9h8v5H4z',
  research: 'M3 2h10v12H3zM5 4v8M8 6h3M8 9h3',
  writing: 'M8 2v5M8 7l-4 4M8 7l4 4M4 11v3M12 11v3M8 7v7',
  resume: 'M4 2h6l3 3v9H4zM10 2v3h3M6 8h5M6 11h5',
};
const icon = (id: string) =>
  `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path d="${ICONS[id]}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

export function shellHTML() {
  return `
  <a class="skip" href="#/about">Skip the journey and go to the biography</a>
  <canvas id="world" aria-hidden="true"></canvas>
  <canvas id="wipe" aria-hidden="true"></canvas>
  <header class="topbar">
    <a class="brand" href="#/" aria-label="${esc(P.name)}, home">
      <svg class="brand-mark" viewBox="0 0 9 9" aria-hidden="true" shape-rendering="crispEdges"><path d="M3 1h3v1h1v1h1v3H1V3h1V2h1z" fill="#F2AE3A"/><path d="M1 4h2v3H1zM6 4h2v3H6z" fill="#2E5BFF"/><path d="M0 7h9v1H0z" fill="#FFF0CF"/></svg>
      <span class="brand-name">${esc(P.name)}</span>
    </a>
    <nav class="mainnav" aria-label="Sections">
      <ul>${NAV.map((n) => `<li><a href="#/${n.id === 'home' ? '' : n.id}" data-nav="${n.id}">${icon(n.id)}<span class="n">${esc(n.n)}</span><span class="l">${esc(n.label)}</span></a></li>`).join('')}${
        shown(P.links.resume) ? `<li><a class="nav-resume" href="${esc(P.links.resume)}" target="_blank" rel="noopener noreferrer">${icon('resume')}<span class="l">Resume</span><span class="x" aria-hidden="true">↗</span></a></li>` : ''
      }</ul>
    </nav>
    <button class="motion-toggle" type="button" aria-pressed="true" title="Turn the animated journey on or off">
      <span class="mt-dot" aria-hidden="true"></span><span class="mt-l">Motion</span> <span class="mt-v">on</span>
    </button>
  </header>
  <nav class="gauge" aria-hidden="true">
    <div class="gauge-scale"><div class="gauge-fill"></div></div>
    ${NAV.map((n) => `<a tabindex="-1" href="#/${n.id === 'home' ? '' : n.id}" data-gauge="${n.id}"><span>${esc(n.n)}</span><em>${esc(n.label)}</em></a>`).join('')}
  </nav>
  <a class="next-action" href="#/about" aria-live="polite"><span class="na-k">Next</span><span class="na-l">About</span><span class="na-a" aria-hidden="true">↓</span></a>
  <main id="journey" tabindex="-1"></main>
  <main id="reader" tabindex="-1" hidden></main>
  <div class="sr-only" aria-live="polite" id="announce"></div>`;
}

const plate = (name: string, alt: string) => `<figure class="plate" data-plate="${name}"><img alt="${esc(alt)}" data-src="${name}"></figure>`;

const interlude = (key: 'about' | 'research' | 'writing') => {
  const c = C[key];
  return `<div class="interlude" id="i-${key}" aria-hidden="true">
    <div class="interlude-card">
      <span class="il-num">${esc(c.number)}</span>
      <span class="il-text"><span class="il-label">${esc(c.label)}</span><span class="il-place">${esc(c.place)}</span><span class="il-line">${esc(c.line)}</span></span>
    </div>
  </div>`;
};

const panelHead = (key: 'about' | 'research' | 'writing', id: string) => {
  const c = C[key];
  return `<header class="panel-head">
    <p class="ph-meta"><span>${esc(c.number)}</span><span>${esc(c.place)}</span></p>
    <h2 id="${id}" tabindex="-1">${esc(c.label)}</h2>
  </header>`;
};

function timeline(items: TimelineItem[]) {
  const vis = items.filter((i) => !i.hidden && shown(i.title));
  if (!vis.length) return '';
  return `<ol class="tl">${vis
    .map(
      (i) => `<li>
      <span class="tl-when">${esc(range(i.start, i.end))}</span>
      <span class="tl-what"><strong>${inline(i.title)}</strong>${
        shown(i.org) ? ` · ${i.orgUrl ? `<a href="${esc(i.orgUrl)}" target="_blank" rel="noopener noreferrer">${esc(i.org!)}</a>` : esc(i.org!)}` : ''
      }${shown(i.place) ? `<span class="tl-place">${esc(i.place!)}</span>` : ''}${shown(i.detail) ? `<span class="tl-detail">${inline(i.detail!)}</span>` : ''}</span>
    </li>`,
    )
    .join('')}</ol>`;
}

function socials() {
  const L = P.links;
  const items: { label: string; url: string }[] = [];
  if (shown(L.github)) items.push({ label: 'GitHub', url: L.github });
  if (shown(L.scholar)) items.push({ label: 'Google Scholar', url: L.scholar });
  if (shown(L.resume)) items.push({ label: 'Resume (PDF)', url: L.resume });
  if (shown(L.linkedin)) items.push({ label: 'LinkedIn', url: L.linkedin });
  for (const e of L.extra ?? []) if (shown(e.url) && shown(e.label)) items.push(e);
  if (shown(L.email)) items.push({ label: 'Email', url: 'mailto:' + L.email });
  return items;
}

export const linkList = (cls = 'links') => {
  const s = socials();
  return s.length
    ? `<ul class="${cls}">${s.map((l) => `<li><a href="${esc(l.url)}"${l.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${esc(l.label)}<span aria-hidden="true">↗</span></a></li>`).join('')}</ul>`
    : '';
};

function home() {
  const recent = P.recent.filter((r) => shown(r.text));
  const item = (r: (typeof recent)[number]) => {
    const body = `<span class="nw-v">${esc(r.value)}</span><span class="nw-b"><span class="nw-l">${esc(r.label)}</span><span class="nw-t">${inline(r.text)}</span></span>`;
    const ext = r.url && /^https?:/.test(r.url);
    return `<li>${r.url ? `<a class="nw" href="${esc(r.url)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${body}<span class="nw-a" aria-hidden="true">→</span></a>` : `<div class="nw">${body}</div>`}</li>`;
  };
  const news = recent.length ? `<h2 class="nw-h">Recent</h2><ul class="news">${recent.map(item).join('')}</ul>` : '';
  return `<section id="home" class="ch ch-home" aria-labelledby="home-title" data-chapter="home">
    ${plate('home', 'Pixel illustration: two pylon towers silhouetted against a giant setting sun')}
    <div class="hero">
      <div class="hero-name">
        <p class="hero-kicker">${esc(P.role)}${shown(P.affiliation) ? ' · ' + esc(P.affiliation) : ''}${shown(P.location) ? ' · ' + esc(P.location) : ''}</p>
        <h1 id="home-title" class="display" aria-label="${esc(P.name)}"><span>${esc(P.heroName[0])}</span><span>${esc(P.heroName[1])}</span></h1>
      </div>
      <div class="hero-side">
        ${shown(P.tagline) ? `<p class="hero-tagline">${inline(P.tagline)}</p>` : ''}
        ${news}
      </div>
    </div>
    <p class="scroll-cue" aria-hidden="true"><span>Scroll to descend</span><span class="sc-bar"></span></p>
  </section>`;
}

function about() {
  if (!site.sections.about) return '<section id="about" class="ch ch-off" hidden></section>';
  const av = P.avatar.file ? `<div class="avatar" data-avatar="${esc(P.avatar.file)}" data-style="${P.avatar.style}"></div>` : `<div class="avatar avatar-empty"></div>`;
  const meta = [
    shown(P.role) ? `<span>${inline(P.role)}</span>` : '',
    shown(P.affiliation) ? `<span>${P.affiliationUrl ? `<a href="${esc(P.affiliationUrl)}" target="_blank" rel="noopener noreferrer">${esc(P.affiliation)}</a>` : inline(P.affiliation)}</span>` : '',
    shown(P.location) ? `<span>${inline(P.location)}</span>` : '',
  ].filter(Boolean).join('');
  const bio = P.bio.filter(shown).map((p) => `<p>${inline(p)}</p>`).join('');
  const interests = P.interests.filter(shown);
  const talks = P.talks.filter((t) => !t.hidden && shown(t.title));
  const exp = timeline(P.experience), edu = timeline(P.education);
  return `${interlude('about')}
  <section id="about" class="ch ch-about" aria-labelledby="about-title" data-chapter="about">
    ${plate('about', 'Pixel illustration: a hall of columns assembled from blocks, its floor wired like a circuit board')}
    <div class="panel panel-l">
      ${panelHead('about', 'about-title')}
      ${site.showPlaceholders && site.draftNotice ? `<p class="draft-note">${inline(site.draftNotice)}</p>` : ''}
      <div class="id-card">
        ${av}
        <div class="id-text">
          <p class="id-name">${esc(P.name)}</p>
          <p class="id-meta">${meta}</p>
        </div>
      </div>
      ${shown(P.shortIntro) ? `<p class="lead">${inline(P.shortIntro)}</p>` : ''}
      ${bio ? `<div class="bio">${bio}</div>` : ''}
      ${interests.length ? `<h3>What I work on</h3><ul class="chips">${interests.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>` : ''}
      ${exp ? `<h3>Experience</h3>${exp}` : ''}
      ${edu ? `<h3>Education</h3>${edu}` : ''}
      ${talks.length ? `<h3>Talks</h3><ul class="talks">${talks.map((t) => `<li>${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${inline(t.title)}</a>` : inline(t.title)}<span>${[t.event, t.date].filter(shown).map(esc).join(' · ')}</span></li>`).join('')}</ul>` : ''}
      ${linkList() ? `<h3>Elsewhere</h3>${linkList()}` : ''}
    </div>
  </section>`;
}

const badge = (s: string) => (s ? `<span class="badge ${statusClass(s)}">${esc(statusLabel(s))}</span>` : '');
const tags = (t: string[]) => (t.filter(shown).length ? `<ul class="tags">${t.filter(shown).map((x) => `<li>${inline(x)}</li>`).join('')}</ul>` : '');
const extLinks = (e: ResearchEntry) =>
  e.links.length ? `<ul class="xlinks">${e.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul>` : '';

function researchCard(e: ResearchEntry, big = false) {
  const meta = [e.authors.filter(shown).join(', '), [e.venue, e.year].filter(shown).join(' · ')].filter(Boolean);
  return `<article class="rcard${big ? ' rcard-big' : ''}" data-kind="${esc(e.kind)}">
    <p class="rc-top"><span class="rc-kind">${esc(e.kind)}</span>${badge(e.status)}</p>
    <h3 class="rc-title"><a href="#/research/${esc(e.slug)}">${inline(e.title)}</a></h3>
    ${meta.map((m, i) => `<p class="rc-meta${i ? ' rc-venue' : ''}">${inline(m)}</p>`).join('')}
    ${shown(e.summary) ? `<p class="rc-sum">${inline(e.summary)}</p>` : ''}
    ${tags(e.tags)}
    <div class="rc-foot"><a class="more" href="#/research/${esc(e.slug)}">${big ? 'Open the research page' : 'Details'} <span aria-hidden="true">→</span></a>${extLinks(e)}</div>
  </article>`;
}

function researchSection() {
  if (!site.sections.research) return '<section id="research" class="ch ch-off" hidden></section>';
  const featured = research.filter((r) => r.featured);
  const pubs = research.filter((r) => !r.featured && (r.kind === 'publication' || r.kind === 'paper'));
  const projects = research.filter((r) => !r.featured && !(r.kind === 'publication' || r.kind === 'paper'));
  return `${interlude('research')}
  <section id="research" class="ch ch-research" aria-labelledby="research-title" data-chapter="research">
    ${plate('research', 'Pixel illustration: looking down a stepped Nilometer shaft at a graduated column and rising water')}
    <div class="panel panel-r">
      ${panelHead('research', 'research-title')}
      ${featured.map((f) => researchCard(f, true)).join('')}
      ${projects.length ? `<h3 class="sub">Projects</h3>${projects.map((p) => researchCard(p)).join('')}` : ''}
      ${pubs.length ? `<h3 class="sub">Publications</h3>${pubs.map((p) => researchCard(p)).join('')}` : ''}
    </div>
  </section>`;
}

function writingSection() {
  if (!site.sections.writing) return '<section id="writing" class="ch ch-off" hidden></section>';
  const rows = writing
    .map(
      (w, i) => `<li class="post" data-branch="${i}">
      <a href="#/writing/${esc(w.slug)}">
        <span class="post-date">${w.date ? esc(fmtDate(w.date)) : 'Soon'}</span>
        <span class="post-main"><span class="post-title">${inline(w.title)}</span>${shown(w.description) ? `<span class="post-desc">${inline(w.description)}</span>` : ''}</span>
        <span class="post-side">${badge(w.status === 'published' ? '' : w.status)}<span class="post-min">${w.status === 'upcoming' ? 'reserved' : w.doc.readingMinutes + ' min'}</span></span>
      </a>
      ${tags(w.tags)}
    </li>`,
    )
    .join('');
  return `${interlude('writing')}
  <section id="writing" class="ch ch-writing" aria-labelledby="writing-title" data-chapter="writing">
    ${plate('writing', 'Pixel illustration: a river delta seen from above, branching into a tree of light over dark fields spelling WRITING')}
    <div class="panel panel-c">
      ${panelHead('writing', 'writing-title')}
      ${rows ? `<ol class="posts">${rows}</ol>` : '<p>Posts will appear here.</p>'}
    </div>
  </section>`;
}

function contact() {
  const c = C.horizon;
  return `<section id="contact" class="ch ch-contact" aria-labelledby="contact-title" data-chapter="contact">
    ${plate('horizon', 'Pixel illustration: the sun setting over the sea beyond the delta')}
    <div class="horizon-card">
      <p class="ph-meta"><span>${esc(c.number)}</span><span>${esc(c.place)}</span></p>
      <h2 id="contact-title" tabindex="-1">${esc(c.label)}</h2>
      <p class="hz-line">${esc(c.line)}</p>
      ${linkList('links links-big')}
      <p class="colophon">${inline(site.footer.note)} World, palette and type: procedural Three.js scene, Egyptian-blue &amp; ochre dither palette, Jersey 10, Archivo, Newsreader, JetBrains Mono. <a href="#/writing/building-a-nilometer">How it is made</a>.</p>
      <p class="hz-top"><a href="#/">Back to the horizon <span aria-hidden="true">↑</span></a></p>
    </div>
  </section>`;
}

export function journeyHTML() {
  return home() + about() + researchSection() + writingSection() + contact();
}
