/* Types for the editable content in /content. You normally never need to touch this file. */

export interface LinkItem {
  label: string;
  url: string;
}

export interface TimelineItem {
  title: string;
  org?: string;
  orgUrl?: string;
  place?: string;
  start?: string;
  end?: string;
  detail?: string;
  /** true = keep the entry in the file but hide it on the site */
  hidden?: boolean;
}

export interface TalkItem {
  title: string;
  event?: string;
  date?: string;
  url?: string;
  hidden?: boolean;
}

export interface RecentItem {
  value: string; // the big number or word, e.g. "SoTA"
  label: string; // what it is, e.g. "Terminal-Bench 2.0 & 2.1"
  text: string; // one or two sentences; supports **bold**, *italic* and [links](…)
  url?: string; // makes the whole item a link
}

export interface ChapterCopy {
  number: string; // "01"
  label: string; // navigation label, e.g. "About"
  place: string; // the place in the world, e.g. "The Hall of Columns"
  line: string; // one line shown during the transition into the chapter
}

export interface SiteConfig {
  meta: { title: string; description: string; lang: string };
  /** true → [bracketed placeholders] are shown & highlighted. false → fields still containing one are hidden. */
  showPlaceholders: boolean;
  /** Small notice shown in the About section while showPlaceholders is true. Empty string = no notice. */
  draftNotice: string;
  /** Turn whole sections off while they are unfinished. */
  sections: { about: boolean; research: boolean; writing: boolean };
  person: {
    name: string;
    /** The two lines of the giant name on the opening scene. */
    heroName: [string, string];
    tagline: string;
    shortIntro: string;
    /** Longer biography: one string per paragraph. Supports **bold**, *italic* and [links](https://…). */
    bio: string[];
    role: string;
    affiliation: string;
    affiliationUrl: string;
    location: string;
    interests: string[];
    /** file: a file name inside content/media/ ('' = designed placeholder). style: 'dither' renders it in the site palette. */
    avatar: { file: string; style: 'dither' | 'photo'; alt: string };
    experience: TimelineItem[];
    education: TimelineItem[];
    talks: TalkItem[];
    /** Shown first, on the opening scene: the latest results worth knowing about. Empty list = hidden. */
    recent: RecentItem[];
    /** Empty strings are hidden automatically. */
    /** resume: a file in public/, shown as a Resume button in the main nav and next to the other links. */
    links: { github: string; scholar: string; linkedin: string; email: string; resume: string; extra: LinkItem[] };
  };
  chapters: { about: ChapterCopy; research: ChapterCopy; writing: ChapterCopy; horizon: ChapterCopy };
  footer: { note: string };
}

export interface MdModule {
  meta: Record<string, any>;
  html: string;
  toc: { id: string; text: string; depth: number }[];
  words: number;
  readingMinutes: number;
  file: string;
}

export interface ResearchEntry {
  slug: string;
  title: string;
  kind: string; // paper | publication | project | talk
  status: string; // provisional | published | preprint | side project | needs details …
  featured: boolean;
  authors: string[];
  venue: string;
  year: string;
  summary: string;
  tags: string[];
  links: LinkItem[];
  source: string;
  order: number;
  doc: MdModule;
}

export interface WritingEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  status: string; // published | upcoming | sample | draft
  order: number;
  doc: MdModule;
}
