/**
 * Hash routing — works on GitHub Pages at any sub-path, with no 404 tricks.
 *   #/            → journey, top
 *   #/about       → journey, jump to About (also #/research, #/writing, #/contact)
 *   #/writing/x   → article page (calm reading layout)
 *   #/research/x  → research detail page (calm reading layout)
 */
export type Section = 'home' | 'about' | 'research' | 'writing' | 'contact';
export type Route =
  | { view: 'journey'; section: Section | null }
  | { view: 'doc'; kind: 'writing' | 'research'; slug: string }
  | { view: 'notfound'; path: string };

const SECTIONS: Section[] = ['home', 'about', 'research', 'writing', 'contact'];

export function parse(hash: string): Route {
  const raw = decodeURIComponent(hash.replace(/^#/, ''));
  const path = raw.replace(/^\/?/, '').replace(/\/+$/, '');
  if (!path) return { view: 'journey', section: null };
  const [a, b] = path.split('/');
  if (!b && (SECTIONS as string[]).includes(a)) return { view: 'journey', section: a as Section };
  if ((a === 'writing' || a === 'research') && b) return { view: 'doc', kind: a, slug: b };
  return { view: 'notfound', path };
}

export function onRoute(cb: (r: Route, same: boolean) => void) {
  window.addEventListener('hashchange', () => cb(parse(location.hash), false));
  // Clicking a link to the hash we are already on doesn't fire hashchange — still act on it.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a[href^="#/"]') as HTMLAnchorElement | null;
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.getAttribute('href') === location.hash || (a.getAttribute('href') === '#/' && !location.hash)) {
      e.preventDefault();
      cb(parse(a.getAttribute('href')!), true);
    }
  });
}
