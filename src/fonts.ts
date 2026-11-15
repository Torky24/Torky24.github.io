// Self-hosted, OFL-licensed fonts (Latin subsets only, to keep the page light).
import jersey from '@fontsource/jersey-10/files/jersey-10-latin-400-normal.woff2?url';
import archivo from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';
import newsreader from '@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2?url';
import newsreaderI from '@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2?url';
import mono400 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import mono700 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2?url';

const css = `
@font-face{font-family:'Jersey 10';src:url(${jersey}) format('woff2');font-display:swap}
@font-face{font-family:'Archivo';src:url(${archivo}) format('woff2-variations');font-weight:100 900;font-stretch:62% 125%;font-display:swap}
@font-face{font-family:'Newsreader';src:url(${newsreader}) format('woff2-variations');font-weight:200 800;font-display:swap}
@font-face{font-family:'Newsreader';src:url(${newsreaderI}) format('woff2-variations');font-weight:200 800;font-style:italic;font-display:swap}
@font-face{font-family:'JetBrains Mono';src:url(${mono400}) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'JetBrains Mono';src:url(${mono700}) format('woff2');font-weight:700;font-display:swap}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
