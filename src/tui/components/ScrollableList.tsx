/**
 * ScrollableList - List component with virtual scrolling
 */

import React, { useMemo } from "react";
import { Box, Text } from "ink";

interface ScrollableListProps<T> {
  /** Items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  /** Currently selected index */
  selectedIndex: number;
  /** Number of visible items */
  visibleCount?: number;
  /** Empty state message */
  emptyMessage?: string;
}

const DEFAULT_VISIBLE_COUNT = 15;

export function ScrollableList<T>({
  items,
  renderItem,
  selectedIndex,
  visibleCount = DEFAULT_VISIBLE_COUNT,
  emptyMessage = "No items",
}: ScrollableListProps<T>): React.ReactElement {
  // Calculate visible range
  const { startIndex, endIndex, showScrollIndicator } = useMemo(() => {
    const total = items.length;
    if (total === 0) {
      return { startIndex: 0, endIndex: 0, showScrollIndicator: false };
    }

    // Keep selected item in view
    let start = Math.max(0, selectedIndex - Math.floor(visibleCount / 2));
    let end = Math.min(total, start + visibleCount);

    // Adjust if we're near the end
    if (end === total) {
      start = Math.max(0, total - visibleCount);
    }

    const showIndicator = total > visibleCount;

    return {
      startIndex: start,
      endIndex: end,
      showScrollIndicator: showIndicator,
    };
  }, [items.length, selectedIndex, visibleCount]);

  if (items.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column">
      {/* Scroll indicator at top */}
      {showScrollIndicator && startIndex > 0 && (
        <Box paddingX={1} paddingY={0}>
          <Text dimColor>↑ {startIndex} more above</Text>
        </Box>
      )}

      {/* Visible items */}
      <Box flexDirection="column">
        {visibleItems.map((item, idx) => {
          const actualIndex = startIndex + idx;
          return (
            <Box key={actualIndex}>
              {renderItem(item, actualIndex, true)}
            </Box>
          );
        })}
      </Box>

      {/* Scroll indicator at bottom */}
      {showScrollIndicator && endIndex < items.length && (
        <Box paddingX={1} paddingY={0}>
          <Text dimColor>↓ {items.length - endIndex} more below</Text>
        </Box>
      )}

      {/* Position indicator */}
      {showScrollIndicator && (
        <Box paddingX={1} paddingY={0}>
          <Text dimColor>
            Showing {startIndex + 1}-{endIndex} of {items.length}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default ScrollableList;

