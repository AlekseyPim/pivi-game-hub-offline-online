import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BOX, SIZE, boxOf, colOf, rowOf } from '@/games/sudoku/constants/board';
import { CONFLICT, TERRITORY } from '@/games/sudoku/constants/colors';
import { useTheme } from '@/games/sudoku/constants/theme';
import type { Cell } from '@/games/sudoku/types/game';

/**
 * The 9×9 grid.
 *
 * Drawn as plain cells with per-cell borders rather than an overlay of lines:
 * the thick rules between 3×3 boxes are just thicker edges on the cells that
 * sit on a box boundary, which keeps everything on one layer and pixel-aligned.
 *
 * The board never renders anything derived from the solution — highlighting is
 * built from what is on screen, so it can never leak an answer.
 */

interface BoardProps {
  cells: Cell[];
  /** Cell under the cursor, or null. */
  selected: number | null;
  /** Cells whose digit clashes with a peer — see `logic/sudoku`. */
  conflicts: Set<number>;
  /** Tint each player's half. Online only. */
  showTerritories: boolean;
  /** Which slot this device plays; its territory is the one you can write in. */
  mySlot: number;
  size: number;
  onPressCell: (index: number) => void;
}

export const Board = memo(function Board({
  cells,
  selected,
  conflicts,
  showTerritories,
  mySlot,
  size,
  onPressCell,
}: BoardProps) {
  const theme = useTheme();
  const cellSize = Math.floor(size / SIZE);
  const side = cellSize * SIZE;

  const activeDigit = selected != null ? cells[selected].value : 0;
  const selRow = selected != null ? rowOf(selected) : -1;
  const selCol = selected != null ? colOf(selected) : -1;
  const selBox = selected != null ? boxOf(selected) : -1;

  return (
    <View
      style={[styles.grid, { width: side, height: side, backgroundColor: theme.gridBg }]}
    >
      {cells.map((cell) => {
        const row = rowOf(cell.index);
        const col = colOf(cell.index);
        const isSelected = cell.index === selected;
        // Row, column and box of the cursor get a soft wash; so does every
        // other copy of the digit under it. Standard sudoku assistance, and
        // purely positional — nothing about correctness.
        const isPeer =
          !isSelected && (row === selRow || col === selCol || boxOf(cell.index) === selBox);
        const isSameDigit =
          !isSelected && activeDigit !== 0 && cell.value === activeDigit;

        const background = isSelected
          ? theme.selected
          : isSameDigit
            ? theme.sameDigit
            : isPeer
              ? theme.peer
              : theme.gridBg;

        return (
          <Pressable
            key={cell.index}
            onPress={() => onPressCell(cell.index)}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: background,
                borderColor: theme.gridLine,
                // Thick rules on the 3×3 seams, and along the outer edge.
                borderLeftWidth: col % BOX === 0 ? 2 : StyleSheet.hairlineWidth,
                borderTopWidth: row % BOX === 0 ? 2 : StyleSheet.hairlineWidth,
                borderRightWidth: col === SIZE - 1 ? 2 : 0,
                borderBottomWidth: row === SIZE - 1 ? 2 : 0,
                borderLeftColor: col % BOX === 0 ? theme.boxLine : theme.gridLine,
                borderTopColor: row % BOX === 0 ? theme.boxLine : theme.gridLine,
                borderRightColor: theme.boxLine,
                borderBottomColor: theme.boxLine,
              },
            ]}
          >
            {showTerritories && !cell.given ? (
              <View
                pointerEvents="none"
                style={[styles.territory, { backgroundColor: TERRITORY[cell.owner] }]}
              />
            ) : null}

            {cell.value !== 0 ? (
              <Text
                style={[
                  styles.digit,
                  {
                    fontSize: cellSize * 0.58,
                    color: conflicts.has(cell.index)
                      ? CONFLICT
                      : cell.given
                        ? theme.given
                        : theme.entered,
                    fontWeight: cell.given ? '700' : '500',
                  },
                ]}
              >
                {cell.value}
              </Text>
            ) : cell.notes.length ? (
              <View style={[styles.notes, { width: cellSize, height: cellSize }]}>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => (
                  <Text
                    key={d}
                    style={[
                      styles.note,
                      {
                        width: cellSize / BOX,
                        height: cellSize / BOX,
                        fontSize: cellSize * 0.22,
                        color: theme.textSecondary,
                        opacity: cell.notes.includes(d) ? 1 : 0,
                      },
                    ]}
                  >
                    {d}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* A cell you may not write in, marked only while you are looking. */}
            {showTerritories && !cell.given && cell.owner !== mySlot && isSelected ? (
              <View pointerEvents="none" style={styles.locked} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  /**
   * No border on the container itself. React Native's box model counts a border
   * inside the declared width, so a 2px frame here leaves the nine cells four
   * pixels too little room and `flexWrap` drops the last column onto a tenth
   * row. The outer frame is drawn by the cells anyway: the first column carries
   * a thick left edge, the first row a thick top one, and the last of each the
   * opposite side.
   */
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  territory: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  digit: { textAlign: 'center' },
  notes: { flexDirection: 'row', flexWrap: 'wrap', position: 'absolute' },
  note: { textAlign: 'center', textAlignVertical: 'center', lineHeight: 12 },
  locked: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: CONFLICT,
  },
});
