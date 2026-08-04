import type { ImageSourcePropType } from 'react-native';

import { emojiForName } from '@/games/ludo/logic/nameEmoji';
import type { PlayerColor } from '@/games/ludo/types/game';

/**
 * Image faces shown in the centre of tokens. The special heart-named player gets
 * a heart, the lion-named one a lion; everyone else a coloured circle for their
 * colour. (require() paths must be static literals for the bundler.)
 */

const COLOR_TOKEN_IMAGE: Record<PlayerColor, ImageSourcePropType> = {
  red: require('../../../../assets/games/ludo/tokens/red_circle.png'),
  green: require('../../../../assets/games/ludo/tokens/large_green_circle.png'),
  yellow: require('../../../../assets/games/ludo/tokens/large_yellow_circle.png'),
  blue: require('../../../../assets/games/ludo/tokens/large_blue_circle.png'),
};
const HEART_TOKEN_IMAGE: ImageSourcePropType = require('../../../../assets/games/ludo/tokens/heart.png');
const LION_TOKEN_IMAGE: ImageSourcePropType = require('../../../../assets/games/ludo/tokens/lion_face.png');

export interface TokenFace {
  source: ImageSourcePropType;
  /** A coloured circle fills the token; a heart/lion icon sits smaller on top. */
  fills: boolean;
}

export function tokenFaceFor(name: string, color: PlayerColor): TokenFace {
  const emoji = emojiForName(name);
  if (emoji === '❤️') return { source: HEART_TOKEN_IMAGE, fills: false };
  if (emoji === '🦁') return { source: LION_TOKEN_IMAGE, fills: false };
  return { source: COLOR_TOKEN_IMAGE[color], fills: true };
}
