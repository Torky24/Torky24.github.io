/**
 * Tiny build-time Markdown loader.
 *
 * Every `*.md` file under /content becomes a JS module:
 *   { meta, html, toc, readingMinutes, words, file }
 *
 * - YAML front-matter between `---` fences becomes `meta`.
 * - Code blocks are syntax-highlighted at build time (highlight.js), so no
 *   highlighting library ships to the browser.
 * - A paragraph that contains only an image becomes <figure> + <figcaption>
 *   (the caption is the image "title":  ![alt](./media/fig.svg "Caption")).
 * - Relative image paths are imported through Vite, so they are fingerprinted
 *   for GitHub Pages and inlined in the single-file build.
 */
import { Marked, type Tokens } from 'marked';
import { parse as parseYaml } from 'yaml';
import hljs from 'highlight.js/lib/common';
import glsl from 'highlight.js/lib/languages/glsl';

hljs.registerLanguage('glsl', glsl);
import type { Plugin } from 'vite';

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

export function markdown(): Plugin {
  return {
    name: 'site-markdown',
    enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('.md')) return null;
      const m = source.match(FRONT);
      let meta: Record<string, unknown> = {};
      let body = source;
      if (m) {
        try {
          meta = (parseYaml(m[1]) as Record<string, unknown>) ?? {};
        } catch (err) {
          this.error(`Front-matter in ${id} is not valid YAML: ${(err as Error).message}`);
        }
        body = source.slice(m[0].length);
      }

      const images: string[] = [];
      const toc: { id: string; text: string; depth: number }[] = [];
      const usedIds = new Set<string>();
      const imgToken = (href: string) => {
        if (/^(https?:|data:|\/\/)/.test(href)) return esc(href);
        images.push(href.startsWith('.') ? href : `./${href}`);
        return `%%IMG${images.length - 1}%%`;
      };

      const md = new Marked({ gfm: true });
      md.use({
        renderer: {
          paragraph(this: any, token: Tokens.Paragraph) {
            const only = token.tokens?.filter((t) => !(t.type === 'text' && !t.raw.trim()));
            if (only && only.length === 1 && only[0].type === 'image') {
              const img = only[0] as Tokens.Image;
              const cap = img.title ? `<figcaption>${esc(img.title)}</figcaption>` : '';
              return `<figure><img src="${imgToken(img.href)}" alt="${esc(img.text)}" loading="lazy" decoding="async">${cap}</figure>\n`;
            }
            return `<p>${this.parser.parseInline(token.tokens)}</p>\n`;
          },
          image(token: Tokens.Image) {
            return `<img src="${imgToken(token.href)}" alt="${esc(token.text)}" loading="lazy" decoding="async">`;
          },
          heading(this: any, token: Tokens.Heading) {
            const inner = this.parser.parseInline(token.tokens);
            let hid = slugify(inner) || `section-${toc.length + 1}`;
            while (usedIds.has(hid)) hid += '-x';
            usedIds.add(hid);
            if (token.depth === 2 || token.depth === 3) toc.push({ id: hid, text: inner.replace(/<[^>]+>/g, ''), depth: token.depth });
            return `<h${token.depth} id="${hid}" tabindex="-1">${inner}</h${token.depth}>\n`;
          },
          link(this: any, token: Tokens.Link) {
            const inner = this.parser.parseInline(token.tokens);
            const ext = /^https?:/.test(token.href);
            const title = token.title ? ` title="${esc(token.title)}"` : '';
            return `<a href="${esc(token.href)}"${title}${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${inner}</a>`;
          },
          code(token: Tokens.Code) {
            const lang = (token.lang || '').trim().split(/\s+/)[0];
            let html: string;
            if (lang && hljs.getLanguage(lang)) html = hljs.highlight(token.text, { language: lang, ignoreIllegals: true }).value;
            else html = esc(token.text);
            const label = lang ? `<span class="code-lang" aria-hidden="true">${esc(lang)}</span>` : '';
            return `<div class="code-block">${label}<pre tabindex="0"><code class="hljs${lang ? ` language-${esc(lang)}` : ''}">${html}</code></pre></div>\n`;
          },
          table(this: any, token: Tokens.Table) {
            const head = token.header.map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</th>`).join('');
            const rows = token.rows
              .map((r) => `<tr>${r.map((c) => `<td${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
              .join('');
            return `<div class="table-wrap" tabindex="0"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
          },
        },
      });

      const html = md.parse(body) as string;
      const words = body.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
      const file = id.split('/').pop()!.replace(/\.md$/, '');

      const imports = images.map((p, i) => `import __img${i} from ${JSON.stringify(p)};`).join('\n');
      const fill = images.map((_, i) => `.split("%%IMG${i}%%").join(__img${i})`).join('');
      const code = `${imports}
const html = ${JSON.stringify(html)}${fill};
export default {
  meta: ${JSON.stringify(meta)},
  html,
  toc: ${JSON.stringify(toc)},
  words: ${words},
  readingMinutes: ${Math.max(1, Math.round(words / 220))},
  file: ${JSON.stringify(file)}
};`;
      return { code, map: null };
    },
  };
}
