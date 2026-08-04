import { BoardThemePicker } from '@/games/minesweeper/components/BoardThemePicker';
import { SettingsScreen } from '@/shared/components/SettingsScreen';

/**
 * The shared settings screen with minesweeper's board palette appended — which
 * is why the game's menu points here rather than at the hub's `/settings`.
 */
export default function MinesweeperSettingsRoute() {
  return (
    <SettingsScreen>
      <BoardThemePicker />
    </SettingsScreen>
  );
}
