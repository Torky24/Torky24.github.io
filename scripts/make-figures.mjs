// Generates the diagrams and charts used by the posts (content/writing/media/fig-*.svg).
// Run: node scripts/make-figures.mjs
// The SVGs are inlined into the pages at build time, so text classes "m" (mono) and "s" (sans)
// pick up the site's fonts; the font-family attribute is only a fallback when a file is opened alone.
import { writeFileSync } from 'node:fs';

const C = {
  bg: '#0b0f24', ink: '#04050d', deep: '#0a1240', lapis: '#1630a8', blue: '#2e5bff', pale: '#8db2ff',
  lime: '#fff0cf', lime2: '#d8cdb8', ochre: '#f2ae3a', red: '#db5a26', umber: '#2a0f0c', mal: '#22b36b', mute: '#8a8fa8',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function make(name, W, H, build) {
  const p = name.replace(/[^a-z0-9]/g, '');
  const defs = `<defs>
<marker id="${p}-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="context-stroke"/></marker>
<pattern id="${p}-d" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${C.ochre}"/><rect x="2" y="2" width="2" height="2" fill="${C.ochre}"/></pattern>
<pattern id="${p}-db" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${C.blue}"/><rect x="2" y="2" width="2" height="2" fill="${C.blue}"/></pattern>
<pattern id="${p}-h" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${C.mute}" opacity=".45"/></pattern>
</defs>`;
  const ctx = { p, out: '' };
  const api = {
    C, id: p,
    add: (s) => (ctx.out += s),
    dither: `url(#${p}-d)`, ditherBlue: `url(#${p}-db)`, hatch: `url(#${p}-h)`,
    t(x, y, str, o = {}) {
      const { size = 14, fill = C.lime, cls = 'm', anchor = 'start', weight = 400, ls = 0, upper = false, italic = false } = o;
      ctx.out += `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"${weight !== 400 ? ` font-weight="${weight}"` : ''}${ls ? ` letter-spacing="${ls}"` : ''}${italic ? ' font-style="italic"' : ''}>${esc(upper ? str.toUpperCase() : str)}</text>`;
    },
    lines(x, y, arr, o = {}) {
      const lh = o.lh ?? (o.size ?? 14) * 1.35;
      arr.forEach((s, i) => api.t(x, y + i * lh, s, o));
    },
    rect(x, y, w, h, o = {}) {
      const { fill = C.deep, stroke = C.blue, sw = 1.5, dash = '' } = o;
      ctx.out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
    },
    box(x, y, w, h, title, sub = [], o = {}) {
      const { accent = false, fill, size = 17 } = o;
      api.rect(x, y, w, h, { fill: fill ?? (accent ? C.umber : C.deep), stroke: accent ? C.ochre : C.blue, sw: accent ? 2 : 1.5 });
      if (accent) ctx.out += `<rect x="${x}" y="${y}" width="${w}" height="5" fill="url(#${p}-d)"/>`;
      api.t(x + 12, y + 28, title, { cls: 's', size, weight: 700 });
      api.lines(x + 12, y + 50, sub, { size: 13, fill: C.lime2, cls: 's' });
    },
    arrow(pts, o = {}) {
      const { stroke = C.pale, sw = 2, dash = '' } = o;
      const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join(' ');
      ctx.out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#${p}-a)"/>`;
    },
    badge(x, y, n) {
      ctx.out += `<rect x="${x - 11}" y="${y - 11}" width="22" height="22" fill="${C.ochre}"/>`;
      api.t(x, y + 5, String(n), { size: 14, fill: C.ink, anchor: 'middle', weight: 700 });
    },
    raw: (s) => (ctx.out += s),
  };
  build(api);
  const ticks = `<rect x="0" y="0" width="${W}" height="3" fill="url(#${p}-d)" opacity=".9"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="JetBrains Mono, Menlo, monospace" shape-rendering="geometricPrecision">${defs}<rect width="${W}" height="${H}" fill="${C.bg}"/>${ticks}${ctx.out}</svg>`;
  writeFileSync(new URL(`../content/writing/media/${name}.svg`, import.meta.url), svg);
  console.log(name, svg.length, 'bytes');
}

const kicker = (a, s) => a.t(24, 34, s, { size: 12, fill: C.ochre, ls: 2, upper: true });

/* ── 1. The platform on one page ─────────────────────────────── */
make('fig-platform-map', 720, 470, (a) => {
  kicker(a, 'One workspace, end to end');
  // people
  a.box(24, 70, 152, 104, 'People', ['in the web client,', 'several at once']);
  // durable stream
  a.t(218, 78, 'DURABLE STREAM', { size: 12, fill: C.pale, ls: 2 });
  const cells = ['msg', 'turn', 'tool', 'plan', 'ok?', 'msg'];
  cells.forEach((c, i) => {
    const x = 218 + i * 46;
    a.rect(x, 90, 42, 52, { fill: i === cells.length - 1 ? C.umber : C.deep, stroke: i === cells.length - 1 ? C.ochre : C.blue });
    a.t(x + 21, 121, c, { size: 12, anchor: 'middle', fill: i === cells.length - 1 ? C.ochre : C.lime2 });
  });
  a.arrow([[218, 160], [490, 160]], { stroke: C.mute, sw: 1.5 });
  a.t(218, 180, 'append-only, one per workspace', { size: 12, fill: C.mute });
  // turn loop
  a.box(548, 70, 148, 104, 'Turn loop', ['run by a supervisor', 'that holds a lease'], { accent: true });
  // arrows top row
  a.arrow([[176, 104], [214, 104]], { stroke: C.ochre });
  a.badge(195, 84, 1);
  a.arrow([[214, 154], [182, 154]], { stroke: C.pale });
  a.badge(195, 196, 5);
  a.arrow([[498, 104], [544, 104]], { stroke: C.ochre });
  a.badge(521, 84, 2);
  a.arrow([[548, 150], [502, 150]], { stroke: C.ochre });
  a.badge(525, 192, 4);
  // bottom row
  a.box(218, 270, 156, 92, 'Read model', ['Postgres, rebuilt', 'from the stream']);
  a.arrow([[296, 194], [296, 266]], { stroke: C.pale });
  a.box(394, 270, 140, 92, 'Models', ['several providers,', 'three clouds']);
  a.box(554, 270, 142, 92, 'Permission', ['checked on', 'every tool call']);
  a.box(554, 384, 142, 66, 'Sandbox', ['microVM per agent'], { size: 16 });
  a.arrow([[600, 174], [600, 220], [464, 220], [464, 266]], { stroke: C.ochre });
  a.arrow([[650, 174], [650, 266]], { stroke: C.ochre });
  a.arrow([[625, 362], [625, 380]], { stroke: C.ochre });
  a.badge(625, 220, 3);
  // footnote
  a.lines(24, 410, ['Nothing important lives only', 'in a process. If one dies,', 'another picks the workspace up', 'from the stream.'], { size: 12.5, fill: C.lime2, cls: 's', lh: 18 });
});

/* ── 2. The turn loop ────────────────────────────────────────── */
make('fig-turn-loop', 720, 380, (a) => {
  kicker(a, 'Every turn runs through one loop');
  const cx = 210, cy = 212, r = 128;
  a.raw(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.blue}" stroke-width="2" stroke-dasharray="6 6"/>`);
  const steps = [
    ['Pick up new', 'messages'],
    ['Call the', 'model'],
    ['Run the tools', 'it asked for'],
    ['Fit the', 'context'],
  ];
  const pos = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
  // arrows along the circle (quarter arcs)
  const half = [0.5, 0.24, 0.5, 0.24]; // angle each box covers on the circle
  for (let i = 0; i < 4; i++) {
    const a0 = -Math.PI / 2 + i * (Math.PI / 2) + half[i] + 0.04, a1 = -Math.PI / 2 + (i + 1) * (Math.PI / 2) - half[(i + 1) % 4] - 0.1;
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    a.raw(`<path d="M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${r} ${r} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" fill="none" stroke="${C.ochre}" stroke-width="3" marker-end="url(#${a.id}-a)"/>`);
  }
  steps.forEach((s, i) => {
    const [x, y] = pos[i];
    a.rect(x - 58, y - 26, 116, 52, { fill: C.deep, stroke: C.blue });
    a.lines(x, y - 4, s, { size: 13, anchor: 'middle', cls: 's', weight: 600, lh: 17 });
  });
  a.lines(cx, cy - 14, ['every change is', 'written to the', 'stream first'], { size: 12.5, anchor: 'middle', fill: C.ochre, lh: 17 });
  // crash panel
  a.rect(430, 74, 266, 278, { fill: C.umber, stroke: C.red, sw: 2 });
  a.raw(`<path d="M462 92 L452 116 L462 116 L454 138 L474 110 L464 110 L472 92 Z" fill="${C.ochre}"/>`);
  a.t(486, 120, 'If a process dies', { cls: 's', size: 17, weight: 700 });
  a.lines(448, 166, [
    'A new one reads the same',
    'records and ends up in',
    'exactly the same place.',
    '',
    'A tool call is only retried',
    'if it is safe to run twice.',
    '',
    'Stop is written down before',
    'anything is cancelled.',
  ], { size: 13, fill: C.lime2, cls: 's', lh: 19 });
});

/* ── 3. Tool discovery ───────────────────────────────────────── */
make('fig-tool-discovery', 720, 360, (a) => {
  kicker(a, 'How the agent finds its tools');
  // before
  a.t(24, 72, 'Every tool in the prompt', { cls: 's', size: 17, weight: 700 });
  a.rect(24, 86, 316, 196, { fill: C.ink, stroke: C.mute, dash: '4 4' });
  a.t(36, 106, 'PROMPT', { size: 11, fill: C.mute, ls: 2 });
  let k = 0;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 5; col++) {
    const x = 36 + col * 60, y = 116 + row * 20;
    a.rect(x, y, 54, 14, { fill: k % 7 === 3 ? C.umber : C.deep, stroke: k % 7 === 3 ? C.red : C.lapis, sw: 1 });
    k++;
  }
  a.lines(24, 306, ['Big prompts, and the model', 'picks the wrong tool more often.'], { size: 13, fill: C.lime2, cls: 's', lh: 19 });
  // after
  a.t(380, 72, 'A small core, the rest on demand', { cls: 's', size: 17, weight: 700 });
  a.rect(380, 86, 316, 196, { fill: C.ink, stroke: C.ochre });
  a.t(392, 106, 'PROMPT', { size: 11, fill: C.ochre, ls: 2 });
  for (let col = 0; col < 4; col++) a.rect(392 + col * 60, 116, 54, 14, { fill: C.deep, stroke: C.blue, sw: 1 });
  a.rect(392, 140, 114, 16, { fill: C.umber, stroke: C.ochre, sw: 1 });
  a.t(400, 152, 'search tools', { size: 11, fill: C.ochre });
  const flow = [['1', 'search', 'by what it needs'], ['2', 'read', 'the description'], ['3', 'call', 'the right tool']];
  flow.forEach(([n, v, s], i) => {
    const y = 184 + i * 30;
    a.badge(404, y, n);
    a.t(424, y + 5, v, { size: 14, weight: 700 });
    a.t(494, y + 5, s, { size: 13, fill: C.lime2, cls: 's' });
  });
  a.lines(380, 306, ['Small prompts, and the right', 'tool is picked more often.'], { size: 13, fill: C.lime2, cls: 's', lh: 19 });
});

/* ── 4. BrowseComp-Plus: searches vs calibration error ───────── */
// Every entry on the public leaderboard above 85% accuracy (Tevatron/BrowseComp-Plus-results, agent_results.csv).
const BCP = [
  { who: 'neuland.ai (ours)', acc: 87.11, s: 8.09, ce: 2.26, ours: true },
  { who: 'LightOn, Console', acc: 86.27, s: 9.7, ce: 6.08 },
  { who: 'Mixedbread', acc: 90.48, s: 11.53, ce: 3.14 },
  { who: 'TopK', acc: 86.87, s: 11.88, ce: 4.1 },
  { who: 'Sail Research', acc: 90.72, s: 12.53, ce: 7.23 },
  { who: 'LightOn, same model + retriever', acc: 87.59, s: 13.27, ce: 6.07, twin: true },
  { who: 'Hamidi Rad et al.', acc: 90.48, s: 33.67, ce: 7.58 },
  { who: 'AI21, 8 agents', acc: 95.18, s: 209.27, ce: 2.35 },
];
make('fig-browsecomp', 720, 440, (a) => {
  kicker(a, 'BrowseComp-Plus: every entry above 85% accuracy');
  const X0 = 78, X1 = 690, Y0 = 360, Y1 = 66; // plot box
  const lx = (v) => X0 + (Math.log(v / 6) / Math.log(300 / 6)) * (X1 - X0);
  const ly = (v) => Y0 - (v / 8.5) * (Y0 - Y1);
  // better corner
  a.t(X0 + 8, Y0 - 10, '↙ BETTER', { size: 11, fill: C.ochre, ls: 2 });
  // grid + axes
  for (const v of [0, 2, 4, 6, 8]) {
    a.raw(`<line x1="${X0}" x2="${X1}" y1="${ly(v)}" y2="${ly(v)}" stroke="${C.lapis}" stroke-opacity=".55" stroke-width="1"/>`);
    a.t(X0 - 10, ly(v) + 4, `${v}%`, { size: 12, fill: C.mute, anchor: 'end' });
  }
  for (const v of [6, 10, 20, 50, 100, 200]) {
    a.raw(`<line x1="${lx(v)}" x2="${lx(v)}" y1="${Y0}" y2="${Y0 + 6}" stroke="${C.mute}"/>`);
    a.t(lx(v), Y0 + 22, String(v), { size: 12, fill: C.mute, anchor: 'middle' });
  }
  a.raw(`<line x1="${X0}" x2="${X1}" y1="${Y0}" y2="${Y0}" stroke="${C.mute}"/>`);
  a.t((X0 + X1) / 2, Y0 + 50, 'Searches per question (log scale), fewer is better', { size: 12.5, fill: C.lime2, anchor: 'middle', cls: 's' });
  a.raw(`<text x="22" y="${(Y0 + Y1) / 2}" class="s" font-size="12.5" fill="${C.lime2}" text-anchor="middle" transform="rotate(-90 22 ${(Y0 + Y1) / 2})">Calibration error, lower is better</text>`);
  // twin comparison line
  const ours = BCP[0], twin = BCP[5];
  a.arrow([[lx(twin.s) - 6, ly(twin.ce) + 6], [lx(ours.s) + 10, ly(ours.ce) - 10]], { stroke: C.ochre, sw: 1.5, dash: '4 4' });
  // label slots for the crowded middle, with leader lines
  const slots = {
    'LightOn, Console': [200, ly(5.25)],
    'Mixedbread': [200, ly(3.05)],
    'TopK': [200, ly(4.15)],
    'Sail Research': [200, ly(7.9)],
    'LightOn, same model + retriever': [200, ly(6.55)],
  };
  for (const e of BCP) {
    const x = lx(e.s), y = ly(e.ce);
    if (e.ours) {
      a.raw(`<rect x="${x - 8}" y="${y - 8}" width="16" height="16" fill="${C.ochre}"/>`);
      a.t(x + 16, y + 20, `neuland.ai (ours) · ${e.acc.toFixed(1)}%`, { size: 13, weight: 700, fill: C.ochre });
      a.t(x + 16, y + 38, `${e.s.toFixed(1)} searches · ${e.ce}% error`, { size: 12, fill: C.lime2 });
      continue;
    }
    a.raw(`<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${e.twin ? C.lime : C.blue}"/>`);
    const slot = slots[e.who];
    if (slot) {
      a.raw(`<path d="M${x + 6} ${y} L${slot[0] - 6} ${slot[1] - 4}" stroke="${C.mute}" stroke-width="1" fill="none"/>`);
      a.t(slot[0], slot[1], `${e.who} · ${e.acc.toFixed(1)}%`, { size: 12, fill: e.twin ? C.lime : C.lime2 });
    } else if (e.s > 100) {
      a.t(x, y - 14, `${e.who} · ${e.acc.toFixed(1)}%`, { size: 12, fill: C.lime2, anchor: 'end' });
    } else {
      a.t(x + 10, y + 22, `${e.who} · ${e.acc.toFixed(1)}%`, { size: 12, fill: C.lime2 });
    }
  }
});

/* ── 5. Permission check ─────────────────────────────────────── */
make('fig-permission-check', 720, 330, (a) => {
  kicker(a, 'Agent Identity: every tool call is checked twice');
  a.box(24, 70, 150, 78, 'Agent wants', ['to call a tool'], { size: 16 });
  const diamond = (cx, cy, l1, l2) => {
    a.raw(`<path d="M${cx} ${cy - 50} L${cx + 82} ${cy} L${cx} ${cy + 50} L${cx - 82} ${cy} Z" fill="${C.deep}" stroke="${C.ochre}" stroke-width="2"/>`);
    a.lines(cx, cy - 4, [l1, l2], { size: 13, anchor: 'middle', cls: 's', weight: 600, lh: 17 });
  };
  diamond(290, 109, 'Does the agent', 'have a grant?');
  diamond(506, 109, 'Is the granter', 'still allowed?');
  a.arrow([[174, 109], [204, 109]]);
  a.arrow([[372, 109], [420, 109]], { stroke: C.mal });
  a.t(396, 100, 'yes', { size: 12, fill: C.mal, anchor: 'middle' });
  a.arrow([[588, 109], [614, 109]], { stroke: C.mal });
  a.t(600, 96, 'yes', { size: 12, fill: C.mal, anchor: 'middle' });
  a.rect(618, 80, 90, 58, { fill: C.deep, stroke: C.mal, sw: 2 });
  a.lines(628, 104, ['Run it,', 'record it'], { size: 13, cls: 's', weight: 700, lh: 17 });
  a.arrow([[290, 159], [290, 214]], { stroke: C.ochre });
  a.t(300, 192, 'no', { size: 12, fill: C.ochre });
  a.rect(178, 218, 224, 92, { fill: C.umber, stroke: C.ochre, sw: 2 });
  a.t(192, 244, 'Ask a person', { cls: 's', size: 16, weight: 700 });
  a.lines(192, 266, ['allow once, always, or no.', 'A one-time yes is handed', 'back if the call never ran.'], { size: 13, fill: C.lime2, lh: 17, cls: 's' });
  a.arrow([[506, 159], [506, 214]], { stroke: C.red });
  a.t(516, 192, 'no', { size: 12, fill: C.red });
  a.rect(430, 218, 152, 92, { fill: C.ink, stroke: C.red, sw: 2 });
  a.t(444, 244, 'Refuse', { cls: 's', size: 16, weight: 700 });
  a.lines(444, 266, ['Fails closed,', 'and keeps a record.'], { size: 13, fill: C.lime2, lh: 17, cls: 's' });
  a.lines(612, 178, ['Each agent has', 'its own identity', 'and never holds', 'credentials.'], { size: 12, fill: C.lime2, cls: 's', lh: 17 });
});

/* ── 6. Storage first ────────────────────────────────────────── */
make('fig-storage-first', 720, 340, (a) => {
  kicker(a, 'Where the state lives');
  a.t(24, 72, 'State on the machines', { cls: 's', size: 17, weight: 700 });
  for (let i = 0; i < 3; i++) {
    const x = 24 + i * 106;
    a.rect(x, 90, 94, 110, { fill: C.deep, stroke: C.mute });
    a.t(x + 47, 116, 'service', { size: 12, anchor: 'middle', fill: C.lime2 });
    a.rect(x + 14, 136, 66, 48, { fill: C.umber, stroke: C.red, sw: 1.5 });
    a.t(x + 47, 165, 'disk', { size: 12, anchor: 'middle', fill: C.red });
  }
  a.lines(24, 252, ['Scaling means moving data,', 'rebalancing and looking after disks.', 'A crash can take state with it.'], { size: 13, fill: C.lime2, cls: 's', lh: 19 });
  // right
  a.t(380, 72, 'Storage first', { cls: 's', size: 17, weight: 700 });
  for (let i = 0; i < 5; i++) {
    const x = 380 + i * 64;
    a.rect(x, 90, 56, 52, { fill: C.deep, stroke: C.blue });
    a.t(x + 28, 121, 'stateless', { size: 9.5, anchor: 'middle', fill: C.lime2 });
    a.arrow([[x + 28, 142], [x + 28, 166]], { stroke: C.ochre, sw: 1.5 });
  }
  a.rect(380, 170, 312, 46, { fill: C.umber, stroke: C.ochre, sw: 2 });
  a.raw(`<rect x="380" y="170" width="312" height="5" fill="url(#${a.id}-d)"/>`);
  a.t(536, 199, 'object storage holds the state', { size: 13, anchor: 'middle', fill: C.ochre, weight: 700 });
  a.lines(380, 252, ['Any machine can pick up any work.', 'More capacity is just more containers,', 'and a crash loses nothing.'], { size: 13, fill: C.lime2, cls: 's', lh: 19 });
});

/* ── 7. rasterix: why page-level work matters ────────────────── */
make('fig-rasterix-long-tail', 720, 400, (a) => {
  kicker(a, 'Four workers, one bundle of PDFs');
  const T0 = 120, scale = 560 / 100; // 100 time units across
  const lane = (y, label, segs, endT) => {
    a.t(24, y + 15, label, { size: 12, fill: C.lime2 });
    for (const [s, e, kind] of segs) {
      const x = T0 + s * scale, w = (e - s) * scale;
      a.rect(x, y, w - 2, 20, { fill: kind === 'big' ? C.red : kind === 'idle' ? a.hatch : C.blue, stroke: kind === 'idle' ? C.mute : 'none', sw: kind === 'idle' ? 1 : 0, dash: kind === 'idle' ? '3 3' : '' });
    }
    if (endT) a.raw(`<line x1="${T0 + endT * scale}" x2="${T0 + endT * scale}" y1="${y - 4}" y2="${y + 24}" stroke="${C.lime}" stroke-width="1.5"/>`);
  };
  a.t(24, 70, 'Split by document', { cls: 's', size: 16, weight: 700 });
  a.t(696, 70, 'one 700-page book holds everyone up', { size: 12, fill: C.red, anchor: 'end' });
  lane(84, 'worker 1', [[0, 96, 'big']]);
  lane(112, 'worker 2', [[0, 14], [14, 26], [26, 34], [34, 96, 'idle']]);
  lane(140, 'worker 3', [[0, 10], [10, 24], [24, 30], [30, 96, 'idle']]);
  lane(168, 'worker 4', [[0, 12], [12, 20], [20, 33], [33, 96, 'idle']]);
  a.raw(`<line x1="${T0 + 96 * scale}" x2="${T0 + 96 * scale}" y1="80" y2="196" stroke="${C.lime}" stroke-width="1.5" stroke-dasharray="3 3"/>`);
  a.t(T0 + 96 * scale - 6, 210, 'done', { size: 12, fill: C.lime, anchor: 'end' });

  a.t(24, 250, 'Split by page, workers steal work (rasterix)', { cls: 's', size: 16, weight: 700 });
  const pages = (seed) => { const out = []; let t = 0, i = 0; while (t < 49) { const d = 3 + ((seed * 7 + i * 5) % 4); out.push([t, Math.min(49, t + d), i % 3 === seed % 3 ? 'big' : '']); t += d; i++; } return out; };
  for (let w = 0; w < 4; w++) lane(264 + w * 28, `worker ${w + 1}`, pages(w));
  a.raw(`<line x1="${T0 + 49 * scale}" x2="${T0 + 49 * scale}" y1="260" y2="376" stroke="${C.ochre}" stroke-width="1.5" stroke-dasharray="3 3"/>`);
  a.t(T0 + 49 * scale + 8, 330, 'done, and nobody sat idle', { size: 12, fill: C.ochre });
  a.t(T0 + 49 * scale + 8, 348, 'red pages are the book,', { size: 12, fill: C.lime2 });
  a.t(T0 + 49 * scale + 8, 364, 'spread across all four', { size: 12, fill: C.lime2 });
  a.t(696, 34, 'illustration, not a measurement', { size: 11, fill: C.mute, anchor: 'end' });
});

/* ── 8. rasterix on olmOCR-bench ─────────────────────────────── */
const OLM = [['rasterix', 61.0], ['pymupdf4llm', 53.8], ['anydoc', 42.1], ['pymupdf', 33.9], ['pypdf', 32.2], ['pdfplumber', 23.8]];
make('fig-rasterix-olmocr', 720, 346, (a) => {
  kicker(a, 'olmOCR-bench: share of reachable assertions passed');
  const X0 = 150, max = 70, W = 500;
  OLM.forEach(([n, v], i) => {
    const y = 66 + i * 40, w = (v / max) * W, top = i === 0;
    a.t(X0 - 12, y + 20, n, { size: 14, anchor: 'end', fill: top ? C.ochre : C.lime2, weight: top ? 700 : 400 });
    a.rect(X0, y + 4, w, 24, { fill: top ? a.dither : C.lapis, stroke: top ? C.ochre : C.blue, sw: top ? 2 : 1 });
    a.t(X0 + w + 10, y + 21, `${v.toFixed(1)}%`, { size: 14, fill: top ? C.ochre : C.lime2, weight: top ? 700 : 400 });
  });
  a.t(24, 332, '7,019 assertions over 1,403 real PDFs, scored with allenai’s own test code.', { size: 12, fill: C.mute, cls: 's' });
});

/* ── 9. Documents in the program, not the prompt ─────────────── */
make('fig-documents-in-program', 720, 360, (a) => {
  kicker(a, 'Where the documents go');
  a.t(24, 72, 'The usual way', { cls: 's', size: 17, weight: 700 });
  a.rect(24, 86, 316, 200, { fill: C.ink, stroke: C.red, sw: 2 });
  a.t(36, 106, 'PROMPT', { size: 11, fill: C.red, ls: 2 });
  for (let i = 0; i < 7; i++) {
    const x = 36 + (i % 4) * 74, y = 116 + Math.floor(i / 4) * 84;
    a.rect(x, y, 66, 76, { fill: C.deep, stroke: C.lapis, sw: 1 });
    for (let l = 0; l < 6; l++) a.rect(x + 8, y + 10 + l * 10, 50 - (l % 3) * 10, 3, { fill: C.mute, stroke: 'none', sw: 0 });
  }
  a.rect(36 + 3 * 74, 200, 66, 76, { fill: C.umber, stroke: C.red, sw: 1, dash: '3 3' });
  a.t(36 + 3 * 74 + 33, 244, 'full', { size: 12, anchor: 'middle', fill: C.red });
  a.lines(24, 312, ['Every result is pasted in. The prompt', 'balloons, and the model reads worse.'], { size: 13, fill: C.lime2, cls: 's', lh: 19 });
  // ours
  a.t(380, 72, 'Ours: documents in the program', { cls: 's', size: 17, weight: 700 });
  a.rect(380, 86, 316, 116, { fill: C.deep, stroke: C.blue });
  a.t(392, 106, 'PYTHON REPL', { size: 11, fill: C.pale, ls: 2 });
  a.t(392, 128, 'docs = {', { size: 13, fill: C.lime });
  for (let i = 0; i < 9; i++) a.rect(404 + i * 30, 138, 24, 30, { fill: C.lapis, stroke: C.blue, sw: 1 });
  a.t(392, 190, '}  # whole documents, kept here', { size: 12, fill: C.mute });
  a.arrow([[538, 204], [538, 222]], { stroke: C.ochre });
  a.t(548, 218, 'only what the code prints', { size: 11.5, fill: C.ochre });
  a.rect(380, 226, 316, 60, { fill: C.ink, stroke: C.ochre, sw: 2 });
  a.t(392, 246, 'PROMPT', { size: 11, fill: C.ochre, ls: 2 });
  for (let l = 0; l < 3; l++) a.rect(392, 256 + l * 9, 160 - l * 40, 4, { fill: C.lime2, stroke: 'none', sw: 0 });
  a.lines(380, 312, ['The model reads with code, so it can', 'afford to search wide.'], { size: 13, fill: C.lime2, cls: 's', lh: 19 });
});
