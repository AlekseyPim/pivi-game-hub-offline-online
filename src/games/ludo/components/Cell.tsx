import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  COLOR_HEX,
  COLOR_TINT,
  GRID_LINE,
  PATH_FILL,
  SAFE_FILL,
} from '@/games/ludo/constants/colors';
import {
  CORRIDOR_MAX,
  CORRIDOR_MIN,
  GRID_SIZE,
} from '@/games/ludo/constants/board';
import { cellRect, type BoardLayout } from '@/games/ludo/logic/layout';
import type { BoardCell } from '@/games/ludo/types/game';

/** In one of the four 6x6 base corners. */
function inBase(row: number, col: number): boolean {
  return (
    (row < CORRIDOR_MIN || row > CORRIDOR_MAX) &&
    (col < CORRIDOR_MIN || col > CORRIDOR_MAX)
  );
}

/** In the central 3x3 finish area. */
function inCenter(row: number, col: number): boolean {
  return (
    row >= CORRIDOR_MIN &&
    row <= CORRIDOR_MAX &&
    col >= CORRIDOR_MIN &&
    col <= CORRIDOR_MAX
  );
}

/**
 * Suppress the line between two cells when both sit inside a base, or when
 * either touches the centre — the centre's borderless so the home triangles
 * meet the arms cleanly.
 */
function lineHidden(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): boolean {
  return (
    (inBase(r1, c1) && inBase(r2, c2)) ||
    inCenter(r1, c1) ||
    inCenter(r2, c2)
  );
}

interface CellProps {
  cell: BoardCell;
  layout: BoardLayout;
}

function backgroundFor(cell: BoardCell): string {
  switch (cell.type) {
    case 'start':
      return COLOR_HEX[cell.color!];
    case 'home':
      return COLOR_HEX[cell.color!];
    case 'base':
      return COLOR_TINT[cell.color!];
    case 'safe':
      return SAFE_FILL;
    case 'center':
      return '#FFE082';
    case 'path':
      return PATH_FILL;
    default:
      return 'transparent';
  }
}

/**
 * A single (possibly rectangular) cell of the non-uniform grid. Purely
 * presentational — it gets a classified BoardCell and the layout, and draws it.
 */
function CellComponent({ cell, layout }: CellProps) {
  const { x, y, w, h } = cellRect(layout, cell.row, cell.col);
  const { row, col } = cell;
  const showStar = cell.type === 'safe' || cell.type === 'start';

  const drawRight =
    col < GRID_SIZE - 1 && !lineHidden(row, col, row, col + 1);
  const drawBottom =
    row < GRID_SIZE - 1 && !lineHidden(row, col, row + 1, col);

  return (
    <View
      style={[
        styles.cell,
        {
          left: x,
          top: y,
          width: w,
          height: h,
          backgroundColor: backgroundFor(cell),
          // Only draw the right/bottom edge; the board frame supplies the outer
          // edges. Every grid line is drawn exactly once (always 1px, never
          // 1+1), and lines inside the bases / center are suppressed entirely.
          borderRightWidth: drawRight ? 1 : 0,
          borderBottomWidth: drawBottom ? 1 : 0,
        },
      ]}
    >
      {showStar && (
        <Text
          style={[
            styles.star,
            { fontSize: Math.min(w, h) * 0.82, lineHeight: Math.min(w, h) * 0.82 },
          ]}
        >
          ☆
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    borderColor: GRID_LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    color: 'rgba(0,0,0,0.25)',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});

export const Cell = memo(CellComponent);
