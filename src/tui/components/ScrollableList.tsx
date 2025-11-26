/**
 * ScrollableList - List component with virtual scrolling
 * Scrolls only when selection reaches the edge of the visible area
 */

import React, { useRef, useEffect } from "react";
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
  // Track the viewport start position
  const viewportStartRef = useRef(0);

  const total = items.length;
  const showScrollIndicator = total > visibleCount;

  // Calculate visible range - only scroll when selection goes out of view
  useEffect(() => {
    if (total === 0) {
      viewportStartRef.current = 0;
      return;
    }

    let start = viewportStartRef.current;

    // If selected item is above the viewport, scroll up
    if (selectedIndex < start) {
      start = selectedIndex;
    }
    // If selected item is below the viewport, scroll down
    else if (selectedIndex >= start + visibleCount) {
      start = selectedIndex - visibleCount + 1;
    }

    // Clamp to valid range
    start = Math.max(0, Math.min(start, total - visibleCount));
    viewportStartRef.current = start;
  }, [selectedIndex, total, visibleCount]);

  // Get current viewport position
  let startIndex = viewportStartRef.current;
  
  // Ensure selection is visible (for initial render)
  if (selectedIndex < startIndex) {
    startIndex = selectedIndex;
  } else if (selectedIndex >= startIndex + visibleCount) {
    startIndex = selectedIndex - visibleCount + 1;
  }
  
  // Clamp to valid range
  startIndex = Math.max(0, Math.min(startIndex, Math.max(0, total - visibleCount)));
  const endIndex = Math.min(total, startIndex + visibleCount);

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
      {/* Scroll indicator at top - always reserve space when scrollable */}
      {showScrollIndicator && (
        <Box paddingX={1} paddingY={0}>
          <Text dimColor>{startIndex > 0 ? "↑" : " "}</Text>
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

      {/* Scroll indicator at bottom - always reserve space when scrollable */}
      {showScrollIndicator && (
        <Box paddingX={1} paddingY={0}>
          <Text dimColor>{endIndex < items.length ? "↓" : " "}</Text>
        </Box>
      )}
    </Box>
  );
}

export default ScrollableList;

