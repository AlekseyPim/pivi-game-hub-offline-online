import { StyleSheet, Text, View } from 'react-native';

import { COLOR_CONTRAST, COLOR_DARK, COLOR_HEX } from '@/games/ludo/constants/colors';
import { emojiForName } from '@/games/ludo/logic/nameEmoji';
import type { Player, Token } from '@/games/ludo/types/game';

interface PlayerPanelProps {
  player: Player;
  tokens: Token[];
  isCurrent: boolean;
}

/**
 * Compact per-player status badge: name, how many tokens are home, and a
 * highlight ring when it is this player's turn.
 */
export function PlayerPanel({ player, tokens, isCurrent }: PlayerPanelProps) {
  const own = tokens.filter((t) => t.color === player.color);
  const finished = own.filter((t) => t.status === 'finished').length;

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: COLOR_HEX[player.color],
          borderColor: isCurrent ? '#FFFFFF' : COLOR_DARK[player.color],
          opacity: isCurrent ? 1 : 0.7,
          transform: [{ scale: isCurrent ? 1.05 : 1 }],
        },
      ]}
    >
      <Text style={[styles.name, { color: COLOR_CONTRAST[player.color] }]}>
        {player.name}
        {emojiForName(player.name) ? (
          <Text style={styles.nameEmoji}>
            {' '}
            {emojiForName(player.name)}
          </Text>
        ) : null}
      </Text>
      <Text style={[styles.meta, { color: COLOR_CONTRAST[player.color] }]}>
        🏠 {finished}/{own.length}
        {player.type === 'bot' ? ' · BOT' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 84,
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
    fontSize: 14,
  },
  nameEmoji: {
    fontSize: 19,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
});
