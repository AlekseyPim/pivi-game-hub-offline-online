import { BoardThemePicker } from '@/games/battleship/components/BoardThemePicker';
import { SettingsScreen } from '@/shared/components/SettingsScreen';

/**
 * The shared settings screen with battleship's water palette appended — which is
 * why the game's menu points here rather than at the hub's `/settings`.
 */
export default function BattleshipSettingsRoute() {
  return (
    <SettingsScreen>
      <BoardThemePicker />
    </SettingsScreen>
  );
}
