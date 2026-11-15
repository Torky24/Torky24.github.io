/* ───────────────────────────────────────────────────────────────────────────
 *  SITE CONTENT: the one file for personal details and site settings.
 *
 *  • Empty strings ('') and empty lists are hidden automatically.
 *  • Long-form content lives in Markdown:
 *      content/research/*.md  → papers & projects
 *      content/writing/*.md   → blog posts
 * ─────────────────────────────────────────────────────────────────────────── */
import type { SiteConfig } from '../src/types';

export const site: SiteConfig = {
  meta: {
    title: 'Islam A. Torky | AI platform engineering & agentic search',
    description:
      'Islam A. Torky builds the platform under enterprise AI agents (runtimes, durable state, authorization and sandboxed execution) and researches agentic search at neuland.ai in Bonn, Germany.',
    lang: 'en',
  },

  showPlaceholders: false,
  draftNotice: '',

  sections: { about: true, research: true, writing: true },

  person: {
    name: 'Islam A. Torky',
    heroName: ['Islam', 'Torky'],
    tagline: 'I build the quiet machinery under AI agents: the loop that keeps them running, the state they remember, and the guardrails that keep them safe.',
    shortIntro:
      'Hi, I’m Islam. I build the platform our AI agents run on at neuland.ai, and I live in Bonn. A lot of my favourite work started as something I just couldn’t leave alone: my agentic-search paper and rasterix both began on evenings and weekends.',
    bio: [
      'Day to day, I’m one of the main engineers on neuland.ai’s [agent platform](#/writing/agent-platform), and I designed its system architecture. I spend most of my time on what sits underneath it: the loop that runs each agent turn, the durable streams everything is rebuilt from, how agents get permission to act for people, and the sandboxes they run code in. I also design how people work with the agent in the app, and set up our tracing and observability. I like hearing from the people who use what we build; a product built from a narrow view ends up having to be pushed on people. I built and introduced our always-on agents, I’m now starting on agent swarms, and the agent harness I built beats Codex and Claude Code on Terminal-Bench in our internal runs. I’m also part of the [research team](https://neuland.ai/en/company/research).',
      'Outside of that, I wrote a [paper on deep-search agents](#/research/agentic-search) in my spare time, trained small language models with SFT and RL to get better at agentic search, and started [rasterix](#/research/rasterix) over a weekend. It began as a fast PDF rasterizer in Rust and has grown into a document engine that turns PDFs and office files into Markdown, and it comes first of six open-source extractors on olmOCR-bench. I also led neuland.ai’s entry on the [BrowseComp-Plus leaderboard](https://huggingface.co/spaces/Tevatron/BrowseComp-Plus): it has the lowest calibration error of any entry, and the fewest searches of any entry above 85% accuracy.',
      'Before neuland.ai I worked in data engineering at Mercedes-Benz Mobility and computer vision at Fraunhofer IOF, and did my master’s in AI at Bauhaus-Universität Weimar.',
    ],
    role: 'AI Platform Engineer',
    affiliation: 'neuland.ai',
    affiliationUrl: 'https://neuland.ai/en/company/research',
    location: 'Bonn, Germany',
    interests: [
      'System architecture',
      'Agent runtimes',
      'Durable streams',
      'Object-storage-first design',
      'Always-on agents',
      'Agent swarms',
      'Agent authorization',
      'Sandboxed code execution',
      'Context engineering',
      'Model access & usage',
      'Observability & tracing',
      'Agent UX',
      'Capacity & load testing',
      'Retrieval & RAG',
      'Agentic search',
      'SFT & RL for small models',
      'Evaluating agents',
    ],
    avatar: { file: 'avatar.jpg', style: 'dither', alt: 'Portrait of Islam A. Torky, rendered in the site’s pixel palette' },

    experience: [
      {
        title: 'Lead AI Engineer',
        org: 'neuland.ai',
        orgUrl: 'https://neuland.ai',
        place: 'Cologne',
        start: 'Dec 2023',
        end: 'present',
        detail:
          'I joined as an AI Engineer in December 2023 and I’m now Lead AI Engineer. Most of my work is on our agent platform: the agent runtime, its durable streams, how agents get permissions, the sandboxes, always-on agents, tool discovery, how we talk to models, tracing on SigNoz, and how people work with all of it in the app. I also worked on OCR and data pipelines on Ray, built rasterix, and built the agent harness behind our benchmark results.',
      },
      {
        title: 'Computer Vision Engineer',
        org: 'Fraunhofer IOF',
        place: 'Jena',
        start: 'Jun 2023',
        end: 'Sep 2023',
        detail: 'Generated synthetic data to train vision models.',
      },
      { title: 'Data Engineer', org: 'Mercedes-Benz Mobility AG', place: 'Stuttgart', start: 'Jul 2022', end: 'Jun 2023' },
      { title: 'Student research assistant (HiWi)', org: 'Bauhaus-Universität Weimar', place: 'Weimar', start: 'Nov 2021', end: 'Aug 2022' },
    ],
    education: [
      { title: 'Industrial PhD', org: 'Paderborn University', place: 'Paderborn', end: 'on hold' },
      { title: 'Master’s degree, Artificial Intelligence', org: 'Bauhaus-Universität Weimar', place: 'Weimar', start: '2021', end: '2024' },
    ],
    talks: [
      {
        title: 'Multi-Agent Industry Model: live demo of a multi-agent document-processing system',
        event: 'neuland.ai Colloquium',
        date: 'Oct 2024',
        url: 'https://www.linkedin.com/posts/kland_ready-for-fridays-ai-deep-dive-this-activity-7255091922766041088-E-WP',
      },
      {
        title: 'Lessons from the frontline: implementing generative AI in real-world applications',
        event: 'TF Consulting, “Is the AI hype over?”',
        date: '2024',
        url: 'https://tfconsult.com/is-the-ai-hype-over/',
      },
    ],
    links: {
      github: 'https://github.com/Torky24',
      scholar: '',
      linkedin: 'https://www.linkedin.com/in/islam-torky',
      email: '',
      resume: 'islam-torky-resume.pdf', // a file in public/; relative, so it works from any GitHub Pages sub-path
      extra: [
        { label: 'X', url: 'https://x.com/torky_islam' },
        { label: 'ACL Anthology', url: 'https://aclanthology.org/people/i/islam-torky/' },
      ],
    },
  },

  chapters: {
    about: { number: '01', label: 'About', place: 'The Hall of Columns', line: 'The person behind the instrument, from Egypt to Bonn.' },
    research: { number: '02', label: 'Research', place: 'The Nilometer', line: 'Measuring the flood: systems, projects and papers.' },
    writing: { number: '03', label: 'Writing', place: 'The Delta', line: 'Where one question branches into many answers.' },
    horizon: { number: '04', label: 'Contact', place: 'The Horizon', line: 'Back to the light.' },
  },

  footer: {
    note: 'Built with an agent harness I made.',
  },
};
