/**
 * ConfirmDialog component - Reusable confirmation dialog with Yes/No menu
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface ConfirmDialogProps {
  /** Title of the confirmation dialog */
  title: string;
  /** Description/message explaining what will happen */
  description?: string;
  /** Text for the confirm option (default: "Yes") */
  confirmText?: string;
  /** Text for the cancel option (default: "No") */
  cancelText?: string;
  /** Color for the title (default: "red") */
  titleColor?: string;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the dialog is active (handles input) */
  isActive?: boolean;
}

export function ConfirmDialog({
  title,
  description,
  confirmText = "Yes",
  cancelText = "No",
  titleColor = "red",
  onConfirm,
  onCancel,
  isActive = true,
}: ConfirmDialogProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(1); // Default to "No" for safety

  useInput(
    (input, key) => {
      // Navigation
      if (key.upArrow || key.downArrow) {
        setSelectedIndex((prev) => (prev === 0 ? 1 : 0));
        return;
      }

      // Select with Enter
      if (key.return) {
        if (selectedIndex === 0) {
          onConfirm();
        } else {
          onCancel();
        }
        return;
      }

      // Quick keys: Y for yes, N for no
      if (input === "y" || input === "Y") {
        onConfirm();
        return;
      }

      if (input === "n" || input === "N" || key.escape) {
        onCancel();
        return;
      }
    },
    { isActive }
  );

  const options = [
    { label: confirmText, isConfirm: true },
    { label: cancelText, isConfirm: false },
  ];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={titleColor}
      paddingX={1}
      paddingY={0}
    >
      {/* Title */}
      <Text color={titleColor} bold>
        {title}
      </Text>

      {/* Description */}
      {description && (
        <Box marginTop={1}>
          <Text>{description}</Text>
        </Box>
      )}

      {/* Options menu */}
      <Box flexDirection="column" marginTop={1}>
        {options.map((option, idx) => {
          const isSelected = idx === selectedIndex;
          const color = option.isConfirm ? "red" : "green";

          return (
            <Box key={idx} gap={1}>
              <Text color={isSelected ? color : "gray"}>
                {isSelected ? "→" : " "}
              </Text>
              <Text color={isSelected ? color : undefined} bold={isSelected}>
                {option.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Help text */}
      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ to select, Enter to confirm, or press Y/N
        </Text>
      </Box>
    </Box>
  );
}

export default ConfirmDialog;

