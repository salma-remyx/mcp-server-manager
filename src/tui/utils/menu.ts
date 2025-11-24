/**
 * Shared menu section utilities for TUI screens
 */

interface MenuSection {
  title: string;
  items: Array<{ key: string; label: string }>;
}

/**
 * Create standard menu sections with screen-specific actions
 * @param actions - Array of action items specific to the screen
 * @returns Complete menu sections array
 */
export function createMenuSections(
  actions: Array<{ key: string; label: string }> = []
): MenuSection[] {
  return [
    {
      title: "Navigation",
      items: [
        { key: "↑↓", label: "Move" },
        { key: "Q", label: "Back" },
      ],
    },
    {
      title: "Actions",
      items: actions,
    },
    {
      title: "Data",
      items: [
        { key: "T", label: "Tools" },
        { key: "F", label: "Profiles" },
        { key: "I", label: "Import/Export" },
      ],
    },
    {
      title: "Config",
      items: [
        { key: "C", label: "Clients" },
        { key: "G", label: "Settings" },
      ],
    },
    {
      title: "System",
      items: [
        { key: "H", label: "Doctor" },
        { key: "K", label: "Tokens" },
      ],
    },
  ];
}
