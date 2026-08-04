import type { Href } from 'expo-router';
import type { ImageSourcePropType } from 'react-native';

import type { GameId } from '@/shared/games/ids';

/**
 * Everything the hub's front page needs to know about a game: how to name it,
 * how to picture it, and where tapping it goes.
 *
 * A game's own screens never read this — it exists so the list can be rendered
 * without importing four games' worth of code (and four boards' worth of
 * modules) just to draw four cards.
 */
export interface GameCard {
  id: GameId;
  /** Translation key for the title, in `shared/i18n/translations`. */
  nameKey: string;
  /** Translation key for the one-line description under the title. */
  taglineKey: string;
  /** Square logo shown on the card. */
  logo: ImageSourcePropType;
  /** Card tint — the game's own accent, so the list reads as four identities. */
  accent: string;
  /**
   * Where the card leads, or null while the game has not been ported into the
   * hub yet (the card then renders disabled with a "coming soon" badge).
   */
  route: Href | null;
}

export const GAMES: GameCard[] = [
  {
    id: 'sudoku',
    nameKey: 'game_sudoku_name',
    taglineKey: 'game_sudoku_tagline',
    logo: require('../../../assets/games/sudoku/logo.png'),
    accent: '#1E88E5',
    route: '/sudoku',
  },
  {
    id: 'minesweeper',
    nameKey: 'game_minesweeper_name',
    taglineKey: 'game_minesweeper_tagline',
    logo: require('../../../assets/games/minesweeper/logo.png'),
    accent: '#E53935',
    route: '/minesweeper',
  },
  {
    id: 'battleship',
    nameKey: 'game_battleship_name',
    taglineKey: 'game_battleship_tagline',
    logo: require('../../../assets/games/battleship/logo.png'),
    accent: '#0B7285',
    route: '/battleship',
  },
  {
    id: 'ludo',
    nameKey: 'game_ludo_name',
    taglineKey: 'game_ludo_tagline',
    logo: require('../../../assets/games/ludo/logo.png'),
    accent: '#F9A825',
    route: '/ludo',
  },
];
