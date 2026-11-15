import { site } from '../content/site';
import type { LinkItem, MdModule, ResearchEntry, WritingEntry } from './types';

const researchMods = import.meta.glob('../content/research/*.md', { eager: true, import: 'default' }) as Record<string, MdModule>;
const writingMods = import.meta.glob('../content/writing/*.md', { eager: true, import: 'default' }) as Record<string, MdModule>;
const media = import.meta.glob('../content/media/*', { eager: true, import: 'default' }) as Record<string, string>;
const plates = import.meta.glob('./assets/plates/*.png', { eager: true, import: 'default' }) as Record<string, string>;

export { site };

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
const list = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : v ? [str(v)] : []);
const LINK_LABELS: Record<string, string> = { paper: 'Paper', pdf: 'PDF', code: 'Code', demo: 'Demo', slides: 'Slides', video: 'Video', 'write-up': 'Write-up', post: 'Post', doi: 'DOI' };

function links(v: unknown): LinkItem[] {
  if (!v || typeof v !== 'object') return [];
  return Object.entries(v as Record<string, unknown>)
    .filter(([, url]) => typeof url === 'string' && url.trim())
    .map(([k, url]) => ({ label: LINK_LABELS[k] ?? k.replace(/(^|-)\w/g, (m) => m.toUpperCase().replace('-', ' ')), url: String(url) }));
}

const usable = (file: string, meta: Record<string, any>) =>
  !file.startsWith('_') && meta.hidden !== true && !(import.meta.env.PROD && meta.status === 'draft');

export const research: ResearchEntry[] = Object.values(researchMods)
  .filter((d) => usable(d.file, d.meta))
  .map((d) => ({
    slug: str(d.meta.slug) || d.file,
    title: str(d.meta.title) || d.file,
    kind: str(d.meta.kind) || 'project',
    status: str(d.meta.status),
    featured: d.meta.featured === true,
    authors: list(d.meta.authors),
    venue: str(d.meta.venue),
    year: str(d.meta.year),
    summary: str(d.meta.summary),
    tags: list(d.meta.tags),
    links: links(d.meta.links),
    source: str(d.meta.source),
    order: Number(d.meta.order ?? 100),
    doc: d,
  }))
  .sort((a, b) => a.order - b.order);

export const writing: WritingEntry[] = Object.values(writingMods)
  .filter((d) => usable(d.file, d.meta))
  .map((d) => ({
    slug: str(d.meta.slug) || d.file,
    title: str(d.meta.title) || d.file,
    description: str(d.meta.description),
    date: str(d.meta.date),
    tags: list(d.meta.tags),
    status: str(d.meta.status) || 'published',
    order: Number(d.meta.order ?? 100),
    doc: d,
  }))
  .sort((a, b) => {
    // undated (upcoming) first by order, then newest first, samples last
    const rank = (e: WritingEntry) => (e.status === 'sample' ? 2 : e.date ? 1 : 0);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.order - b.order;
  });

export function mediaUrl(file: string): string {
  if (!file) return '';
  const hit = Object.entries(media).find(([k]) => k.endsWith('/' + file));
  return hit ? hit[1] : '';
}

export function plateUrl(name: string): string {
  const hit = Object.entries(plates).find(([k]) => k.endsWith('/' + name + '.png'));
  return hit ? hit[1] : '';
}
