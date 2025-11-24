/**
 * Shared menu section utilities for TUI screens
 */

export interface MenuSection {
  title: string;
  items: Array<{ key: string; label: string }>;
}

export interface CreateMenuSectionsOptions {
  /** Screen-specific action items */
  actions?: Array<{ key: string; label: string }>;
  /** Show "Data" section (Tools, Profiles, Import/Export) */
  showData?: boolean;
  /** Show "Config" section (Clients, Settings) */
  showConfig?: boolean;
  /** Show "System" section (Doctor, Tokens) */
  showSystem?: boolean;
  /** Show "Daemon" in system section */
  showDaemon?: boolean;
}

/**
 * Create standard menu sections with configurable visibility
 * @param options - Configuration options for which sections to show
 * @returns Menu sections array based on options
 */
export function createMenuSections(options: CreateMenuSectionsOptions = {}): MenuSection[] {
  const {
    actions = [],
    showData = true,
    showConfig = true,
    showSystem = true,
    showDaemon = true,
  } = options;

  const sections: MenuSection[] = [
    {
      title: "Navigation",
      items: [
        { key: "↑↓", label: "Move" },
        { key: "Q", label: "Back" },
      ],
    },
  ];

  // Add actions section only if there are actions
  if (actions.length > 0) {
    sections.push({
      title: "Actions",
      items: actions,
    });
  }

  // Add optional sections based on configuration
  if (showData) {
    sections.push({
      title: "Data",
      items: [
        { key: "T", label: "Tools" },
        { key: "F", label: "Profiles" },
        { key: "I", label: "Import/Export" },
      ],
    });
  }

  if (showConfig) {
    sections.push({
      title: "Config",
      items: [
        { key: "C", label: "Clients" },
        { key: "G", label: "Settings" },
      ],
    });
  }

  if (showSystem) {
    const systemItems = [{ key: "H", label: "Doctor" }];
    if (showDaemon) {
      systemItems.push({ key: "M", label: "Daemon" });
    }
    systemItems.push({ key: "K", label: "Tokens" });

    sections.push({
      title: "System",
      items: systemItems,
    });
  }

  return sections;
}
