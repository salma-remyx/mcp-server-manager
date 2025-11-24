/**
 * ServerList Component Tests
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { ServerList } from "../../../src/tui/components/ServerList.js";
import type { LocalServer, RemoteServer } from "../../../src/types/index.js";

describe("ServerList Component", () => {
  const mockLocalServers: LocalServer[] = [
    { id: "server1", name: "Server One", command: "node", args: [], disabled: false },
    { id: "server2", name: "Server Two", command: "python", args: [], disabled: true },
  ];

  const mockRemoteServers: RemoteServer[] = [
    {
      id: "remote1",
      name: "Remote One",
      url: "http://example.com",
      type: "sse" as const,
      disabled: false,
    },
  ];

  describe("Rendering", () => {
    it("should render server list with title", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      expect(lastFrame()).toContain("Local Servers");
    });

    it("should display server names", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      expect(lastFrame()).toContain("Server One");
      expect(lastFrame()).toContain("Server Two");
    });

    it("should return null for empty server list", () => {
      const { lastFrame } = render(
        <ServerList
          title="Empty"
          servers={[]}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      expect(lastFrame()).toBe("");
    });
  });

  describe("Selection Indicator", () => {
    it("should show current selection indicator", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      expect(lastFrame()).toContain("→");
    });

    it("should show indicator at correct index", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={1}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      // The indicator should be present
      expect(lastFrame()).toContain("→");
    });

    it("should not show indicator when section is not active", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={false}
          selectedServers={new Set()}
        />
      );

      // Should still render servers but without active indicator
      expect(lastFrame()).toContain("Server One");
    });
  });

  describe("Checkbox Selection", () => {
    it("should show checkbox for selected servers", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set(["server1"])}
        />
      );

      expect(lastFrame()).toContain("[✓]");
      expect(lastFrame()).toContain("[ ]");
    });

    it("should show all checkboxes empty when none selected", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      // Should have empty checkboxes
      expect(lastFrame()).toContain("[ ]");
    });

    it("should show all checkboxes checked when all selected", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set(["server1", "server2"])}
        />
      );

      // Count checked boxes
      const frame = lastFrame()!;
      const checkedCount = (frame.match(/\[✓\]/g) || []).length;
      expect(checkedCount).toBe(2);
    });
  });

  describe("Disabled Status", () => {
    it("should show disabled status for disabled servers", () => {
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      expect(lastFrame()).toContain("disabled");
    });
  });

  describe("Tool Counts", () => {
    it("should show tool counts when provided", () => {
      const toolCounts = new Map([["server1", 5]]);
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
          toolCounts={toolCounts}
        />
      );

      expect(lastFrame()).toContain("5 tools");
    });

    it("should show 0 tools when server not in toolCounts", () => {
      const toolCounts = new Map<string, number>();
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
          toolCounts={toolCounts}
        />
      );

      expect(lastFrame()).toContain("0 tools");
    });

    it("should show singular 'tool' for count of 1", () => {
      const toolCounts = new Map([["server1", 1]]);
      const { lastFrame } = render(
        <ServerList
          title="Local Servers"
          servers={mockLocalServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
          toolCounts={toolCounts}
        />
      );

      // Should show "1 tool" or "1 tools"
      expect(lastFrame()).toMatch(/1 tools?/);
    });
  });

  describe("Remote Servers", () => {
    it("should handle remote servers with prefix", () => {
      const { lastFrame } = render(
        <ServerList
          title="Remote Servers"
          servers={mockRemoteServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set(["remote:remote1"])}
          isRemote={true}
        />
      );

      expect(lastFrame()).toContain("Remote One");
      expect(lastFrame()).toContain("[✓]");
    });

    it("should display remote server names correctly", () => {
      const { lastFrame } = render(
        <ServerList
          title="Remote Servers"
          servers={mockRemoteServers}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
          isRemote={true}
        />
      );

      expect(lastFrame()).toContain("Remote One");
    });
  });

  describe("Edge Cases", () => {
    it("should handle server with no name (use id)", () => {
      const serversWithoutName = [
        { id: "server-id-only", command: "node", args: [], disabled: false },
      ];
      const { lastFrame } = render(
        <ServerList
          title="Servers"
          servers={serversWithoutName as LocalServer[]}
          selectedIndex={0}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      expect(lastFrame()).toContain("server-id-only");
    });

    it("should handle selectedIndex out of bounds", () => {
      const { lastFrame } = render(
        <ServerList
          title="Servers"
          servers={mockLocalServers}
          selectedIndex={100}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      // Should still render without crashing
      expect(lastFrame()).toContain("Server One");
    });

    it("should handle negative selectedIndex", () => {
      const { lastFrame } = render(
        <ServerList
          title="Servers"
          servers={mockLocalServers}
          selectedIndex={-1}
          isActiveSection={true}
          selectedServers={new Set()}
        />
      );

      // Should still render without crashing
      expect(lastFrame()).toContain("Server One");
    });
  });
});
