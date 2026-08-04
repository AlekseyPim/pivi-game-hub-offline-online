import { GameSettings } from '@/games/ludo/components/GameSettings';
import { SettingsScreen } from '@/shared/components/SettingsScreen';

/**
 * The shared settings screen with ludo's fast mode and player names appended —
 * which is why the game's menu points here rather than at the hub's `/settings`.
 */
export default function LudoSettingsRoute() {
  return (
    <SettingsScreen>
      <GameSettings />
    </SettingsScreen>
  );
}
