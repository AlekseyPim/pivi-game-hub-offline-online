import { COLOR_HEX } from '@/games/ludo/constants/colors';
import type { CelebrationOptions } from '@/shared/store/fireworksStore';
import type { PlayerColor } from '@/games/ludo/types/game';

/**
 * Ludo's victory salute, expressed for the hub's shared fireworks overlay.
 *
 * The overlay picks a particle colour uniformly at random from the palette it is
 * given, so the mix is expressed by repeating entries: mostly the winner's
 * colour with the odd bronze/magenta sparkle, or mostly gold with the occasional
 * spark of the winner's colour once they are a supporter.
 */

/** The odd off-colour spark that keeps a single-colour burst from looking flat. */
const SPARKLES = ['#c18d12', '#c341a3'] as const;

const GOLD_TINTS = ['#FFD700', '#FFC107', '#FFE082', '#FFF59D'] as const;

export function ludoCelebration(
  color: PlayerColor,
  heart: boolean,
  gold: boolean,
): CelebrationOptions {
  const own = COLOR_HEX[color];
  if (gold) {
    // ~17% the winner's colour, the rest gold.
    const tints = [...GOLD_TINTS, ...GOLD_TINTS, ...GOLD_TINTS, ...GOLD_TINTS, ...GOLD_TINTS];
    return { gold: true, heart, tints: [...tints, own, own, own, own] };
  }
  // ~22% sparkles, the rest the winner's colour.
  const tints = [own, own, own, own, own, own, own, ...SPARKLES];
  return { gold: false, heart, tints };
}
