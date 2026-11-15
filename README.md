# Islam A. Torky: personal website

My personal site, with my research, projects and writing on AI agent platforms and agentic search. It's a scroll-driven, pixel-rendered descent through a Nilometer, the ancient Egyptian instrument that measured the Nile flood. I built it with an agent harness I made.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173 with live reload
npm run build          # static site in dist/
npm run preview        # serve dist/ locally
npm run build:single   # dist-single/index.html, one self-contained file
npm run check          # TypeScript check
```

Requires Node 20 or newer.

## Deploy

`.github/workflows/deploy.yml` builds `dist/` and publishes it to GitHub Pages on every push to `main`. In the repository, set **Settings → Pages → Source** to **GitHub Actions** once.

Asset paths are relative and routes use the hash (`#/writing/my-post`), so the site works at `username.github.io` or `username.github.io/any-repo-name/` without a 404 workaround.

## Where things live

| To change                                   | Edit                                                    |
|---------------------------------------------|---------------------------------------------------------|
| Name, intro, bio, experience, links         | `content/site.ts`                                       |
| "Recent" highlights on the home page        | `recent` in `content/site.ts`                           |
| Diagrams and charts in the posts            | `scripts/make-figures.mjs`, then `node scripts/make-figures.mjs` |
| Resume PDF                                  | `public/islam-torky-resume.pdf`                         |
| Photo                                       | `content/media/avatar.jpg`                              |
| Papers and projects                         | `content/research/*.md` (copy `_template.md` to add one) |
| Posts                                       | `content/writing/*.md` (copy `_template.md` to add one)  |
| Hide an entry                               | `hidden: true` in its front matter                      |

In a post, `![alt](./media/fig.svg "Caption")` on its own line becomes a figure (local SVGs are inlined so they use the site's fonts), and a ` ```stats ` block with one `value | label` per line becomes a row of big numbers.

## How it's made

- **Rendering.** A three.js world rendered at about a third of screen resolution. A post-process shader maps every pixel onto two six-step ramps, Egyptian blue and ochre to limestone, with 8×8 ordered dithering. Text stays sharp, selectable HTML.
- **Type.** Jersey 10, Archivo, Newsreader, and JetBrains Mono, all OFL and self-hosted. Everything in the world is procedural.
- **Motion and accessibility.** Scrolling is the only control. With reduced motion or no WebGL, the world becomes still plates of each scene. Keyboard navigation, focus management, no flashing and no scroll hijacking. Phones get a bottom tab bar and a lighter world.

## Structure

```
content/            site.ts, media, research/*.md, writing/*.md
src/
  main.ts           boot, routing, scroll to camera, navigation
  ui/               journey, reader and avatar markup
  world/            three.js scenes, camera timeline, materials, dither pass
  styles/           base, journey, reading
plugins/markdown.ts build-time Markdown to HTML
tests/e2e.mjs       Playwright checks
scripts/            plate renderer and figure generator
```

Run the checks after a build: `npx vite preview --base ./`, then `node tests/e2e.mjs http://localhost:4173/ dist-single/index.html` (needs Playwright).
