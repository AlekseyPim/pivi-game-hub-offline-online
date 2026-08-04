import { BOX, CELLS, CENTRE_BOX, SIZE, boxCells } from '@/games/sudoku/constants/board';

/**
 * Carve the grid into one territory per player for an online duel.
 *
 * The eight outer 3×3 boxes are dealt out at random, four each, and the middle
 * box — the one every player wants, because it touches everything — is split
 * down the middle, five cells to one side and four to the other, also at
 * random. So each player ends up with roughly half the grid and a foothold in
 * the centre, and no two matches look alike.
 *
 * Single-player games skip this entirely: every cell belongs to player 0.
 */
export function splitTerritories(): number[] {
  const owner = new Array<number>(CELLS).fill(0);

  const outer = shuffle(
    Array.from({ length: SIZE }, (_, b) => b).filter((b) => b !== CENTRE_BOX),
  );
  outer.forEach((box, i) => {
    // First four boxes drawn go to player 0, the rest to player 1.
    const slot = i < outer.length / 2 ? 0 : 1;
    for (const cell of boxCells(box)) owner[cell] = slot;
  });

  // Nine cells do not halve evenly; the extra one is tossed for.
  const centre = shuffle(boxCells(CENTRE_BOX));
  const firstShare = Math.random() < 0.5 ? BOX + 1 : BOX + 2;
  centre.forEach((cell, i) => {
    owner[cell] = i < firstShare ? 0 : 1;
  });

  return owner;
}

/** Every cell belongs to one player — the single-player case. */
export function soleOwner(): number[] {
  return new Array<number>(CELLS).fill(0);
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
