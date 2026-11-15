/** The only colours the world is allowed to output. Six steps each, dark → light. */
export const COOL = ['#04050D', '#0A1240', '#1630A8', '#2E5BFF', '#8DB2FF', '#EAF1FF']; // Egyptian blue
export const WARM = ['#04050D', '#2A0F0C', '#8C2A17', '#DB5A26', '#F2AE3A', '#FFF0CF']; // ochre → limestone
export const MAL = ['#04050D', '#062A1E', '#0E6B45', '#22B36B', '#8BF0B5', '#EFFFF5']; // malachite (highlights)

export const hex3 = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** 5×7 bitmap glyphs for the voxel inscriptions inside the world. */
export const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/** Cells (col,row) of a word in the 5×7 font; row 0 = top. */
export function wordCells(word: string): { cols: number; cells: [number, number][] } {
  const cells: [number, number][] = [];
  let x = 0;
  for (const ch of word.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    g.forEach((row, r) => [...row].forEach((c, k) => c === '#' && cells.push([x + k, r])));
    x += 6;
  }
  return { cols: x - 1, cells };
}
