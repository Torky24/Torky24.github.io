import { site } from '../content/site';

export const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Text in [brackets] that is not a markdown link counts as a placeholder. */
export const hasPlaceholder = (s: string) => /\[[^\]]+\](?!\()/.test(s);

/** Should this optional value be rendered at all? */
export const shown = (s: string | undefined | null): s is string =>
  !!s && !!String(s).trim() && (site.showPlaceholders || !hasPlaceholder(String(s)));

const PH = '<mark class="ph" title="Placeholder: edit the content files">';

/** Escape + tiny inline markdown (**bold**, *italic*, [link](url)) + placeholder highlighting. */
export function inline(s: string): string {
  let h = esc(s);
  h = h.replace(/\[([^\]]+)\]\(((?:https?:|mailto:|#)[^)\s]*)\)/g, (_m, t, u) => {
    const ext = /^https?:/.test(u);
    return `<a href="${u}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${t}</a>`;
  });
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  h = h.replace(/\[([^\]]+)\]/g, `${PH}[$1]</mark>`);
  return h;
}

/** Highlight [placeholders] inside rendered Markdown, outside of code and attributes. */
export function markPlaceholders(html: string): string {
  const parts = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/g);
  return parts
    .map((p, i) =>
      i % 2 === 1 ? p : p.replace(/>([^<]*)</g, (_m, text: string) => '>' + text.replace(/\[([^\]\n]{1,160})\]/g, `${PH}[$1]</mark>`) + '<'),
    )
    .join('');
}

export function fmtDate(d: string): string {
  if (!d) return '';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return d;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const range = (a?: string, b?: string) => [a, b].filter(Boolean).join(' – ');

export const statusLabel = (s: string) => {
  const k = s.toLowerCase();
  if (k === 'provisional') return 'Provisional';
  if (k === 'upcoming') return 'Upcoming';
  if (k === 'sample') return 'Sample';
  if (k === 'draft') return 'Draft';
  if (k === 'needs details') return 'Needs details';
  if (k === 'published') return 'Published';
  return s;
};

export const statusClass = (s: string) => 'st-' + s.toLowerCase().replace(/[^a-z]+/g, '-');

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T | null;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];
