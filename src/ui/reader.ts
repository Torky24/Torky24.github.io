import { site, research, writing } from '../content';
import { esc, inline, shown, fmtDate, statusLabel, statusClass, markPlaceholders } from '../util';

const notice: Record<string, string> = {
  provisional: 'Provisional entry: this page reserves space and contains placeholders, not findings.',
  upcoming: 'Reserved post: the text below is a scaffold, not the article.',
  sample: 'Sample content: demonstrates the reading template; not part of the real profile.',
  'needs details': 'Details still to confirm: listed on LinkedIn; authors and venue are placeholders.',
};

const badge = (s: string) => (s && s !== 'published' ? `<span class="badge ${statusClass(s)}">${esc(statusLabel(s))}</span>` : '');

function toc(items: { id: string; text: string; depth: number }[]) {
  if (items.length < 3) return '';
  return `<nav class="toc" aria-label="On this page"><p>On this page</p><ol>${items
    .map((t) => `<li class="d${t.depth}"><button type="button" data-goto="${esc(t.id)}">${esc(t.text)}</button></li>`)
    .join('')}</ol></nav>`;
}

export function docHTML(kind: 'writing' | 'research', slug: string): { html: string; title: string } | null {
  if (kind === 'writing') {
    const list = writing;
    const i = list.findIndex((w) => w.slug === slug);
    if (i < 0) return null;
    const w = list[i];
    const next = list[i + 1];
    const body = site.showPlaceholders ? markPlaceholders(w.doc.html) : w.doc.html;
    return {
      title: w.title,
      html: `<article class="doc">
        <p class="doc-back"><a href="#/writing">← All writing</a></p>
        <header class="doc-head">
          <p class="doc-kicker">${w.date ? `<time datetime="${esc(w.date)}">${esc(fmtDate(w.date))}</time>` : '<span>Coming soon</span>'}<span>${w.status === 'upcoming' ? 'Reserved' : w.doc.readingMinutes + ' min read'}</span>${badge(w.status)}</p>
          <h1 id="doc-title" tabindex="-1">${inline(w.title)}</h1>
          ${shown(w.description) ? `<p class="doc-dek">${inline(w.description)}</p>` : ''}
          ${notice[w.status] ? `<p class="doc-notice ${statusClass(w.status)}">${esc(notice[w.status])}</p>` : ''}
          ${w.tags.length ? `<ul class="doc-tags">${w.tags.filter(shown).map((t) => `<li>${inline(t)}</li>`).join('')}</ul>` : ''}
        </header>
        ${toc(w.doc.toc)}
        <div class="prose">${body}</div>
        <footer class="doc-foot">
          <p class="doc-by">${esc(site.person.name)}${shown(site.person.affiliation) ? ' · ' + esc(site.person.affiliation) : ''}</p>
          <nav aria-label="More writing"><a href="#/writing">← All writing</a>${next ? `<a href="#/writing/${esc(next.slug)}">Next: ${inline(next.title)} →</a>` : ''}</nav>
        </footer>
      </article>`,
    };
  }
  const e = research.find((r) => r.slug === slug);
  if (!e) return null;
  const body = site.showPlaceholders ? markPlaceholders(e.doc.html) : e.doc.html;
  return {
    title: e.title,
    html: `<article class="doc">
      <p class="doc-back"><a href="#/research">← All research</a></p>
      <header class="doc-head">
        <p class="doc-kicker"><span>${esc(e.kind)}</span>${shown(e.year) ? `<span>${inline(e.year)}</span>` : ''}${badge(e.status)}</p>
        <h1 id="doc-title" tabindex="-1">${inline(e.title)}</h1>
        ${e.authors.filter(shown).length ? `<p class="doc-authors">${e.authors.filter(shown).map(inline).join(', ')}</p>` : ''}
        ${shown(e.venue) ? `<p class="doc-venue">${inline(e.venue)}</p>` : ''}
        ${notice[e.status] ? `<p class="doc-notice ${statusClass(e.status)}">${esc(notice[e.status])}</p>` : ''}
        ${shown(e.summary) ? `<p class="doc-dek">${inline(e.summary)}</p>` : ''}
        ${e.links.length ? `<ul class="doc-links">${e.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a></li>`).join('')}</ul>` : ''}
        ${e.tags.length ? `<ul class="doc-tags">${e.tags.filter(shown).map((t) => `<li>${inline(t)}</li>`).join('')}</ul>` : ''}
      </header>
      ${toc(e.doc.toc)}
      <div class="prose">${body}</div>
      <footer class="doc-foot">
        ${shown(e.source) ? `<p class="doc-by">Source: ${inline(e.source)}</p>` : ''}
        <nav aria-label="More research"><a href="#/research">← All research</a><a href="#/about">About ${esc(site.person.name)} →</a></nav>
      </footer>
    </article>`,
  };
}

export function notFoundHTML(path: string) {
  return `<article class="doc"><header class="doc-head"><p class="doc-kicker"><span>404</span></p><h1 id="doc-title" tabindex="-1">Nothing measured here</h1><p class="doc-dek">No page at <code>${esc(path)}</code>. The flood may have moved it.</p></header><p><a href="#/">← Back to the horizon</a></p></article>`;
}
