/**
 * ProfilesScreen - Manage server profiles (ink component)
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { Header, MenuPanel } from "../components/index.js";
import { createMenuSections } from "../utils/menu.js";
import { getProfileService } from "../../services/profile.service.js";
import type { ProfileListItem } from "../../types/index.js";

type View = "list" | "create" | "confirmDelete";

interface ProfilesScreenProps {
  onBack: () => void;
}

interface ProfilesState {
  profiles: ProfileListItem[];
  currentIndex: number;
  view: View;
  newProfileName: string;
  message: string | null;
  messageType: "success" | "error" | "info";
}

export function ProfilesScreen({ onBack }: ProfilesScreenProps): React.ReactElement {
  const profileService = getProfileService();

  const [state, setState] = useState<ProfilesState>({
    profiles: profileService.list(),
    currentIndex: 0,
    view: "list",
    newProfileName: "",
    message: null,
    messageType: "info",
  });

  // Show temporary message
  const showMessage = useCallback(
    (msg: string, type: "success" | "error" | "info" = "info") => {
      setState((prev) => ({ ...prev, message: msg, messageType: type }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, message: null }));
      }, 2000);
    },
    []
  );

  // Handle create profile
  const handleCreateProfile = useCallback(
    (name: string) => {
      if (!name.trim()) {
        setState((prev) => ({ ...prev, view: "list", newProfileName: "" }));
        return;
      }

      const id = name.toLowerCase().replace(/\s+/g, "-");
      const result = profileService.create(id, name.trim());

      if (result.success) {
        showMessage(`Profile '${name}' created`, "success");
        setState((prev) => ({
          ...prev,
          profiles: profileService.list(),
          view: "list",
          newProfileName: "",
        }));
      } else {
        showMessage(result.error || "Failed to create profile", "error");
        setState((prev) => ({ ...prev, view: "list", newProfileName: "" }));
      }
    },
    [profileService, showMessage]
  );

  // Handle delete profile
  const handleDeleteProfile = useCallback(
    (confirm: boolean) => {
      if (!confirm) {
        setState((prev) => ({ ...prev, view: "list" }));
        return;
      }

      const profile = state.profiles[state.currentIndex];
      if (!profile) {
        setState((prev) => ({ ...prev, view: "list" }));
        return;
      }

      const result = profileService.delete(profile.id);
      if (result.success) {
        showMessage("Profile deleted", "success");
        setState((prev) => ({
          ...prev,
          profiles: profileService.list(),
          currentIndex: Math.max(0, prev.currentIndex - 1),
          view: "list",
        }));
      } else {
        showMessage(result.error || "Failed to delete profile", "error");
        setState((prev) => ({ ...prev, view: "list" }));
      }
    },
    [state.profiles, state.currentIndex, profileService, showMessage]
  );

  // Handle keyboard input
  useInput((input, key) => {
    const { profiles, currentIndex, view } = state;

    // Handle confirm delete view
    if (view === "confirmDelete") {
      if (input === "y" || input === "Y") {
        handleDeleteProfile(true);
      } else if (input === "n" || input === "N" || key.escape) {
        handleDeleteProfile(false);
      }
      return;
    }

    // Handle create view
    if (view === "create") {
      if (key.escape) {
        setState((prev) => ({ ...prev, view: "list", newProfileName: "" }));
      }
      return;
    }

    // List view
    // Quit
    if (input === "q" || key.escape) {
      onBack();
      return;
    }

    // Navigation - Up
    if (key.upArrow && profiles.length > 0) {
      setState((prev) => ({
        ...prev,
        currentIndex: (currentIndex - 1 + profiles.length) % profiles.length,
      }));
      return;
    }

    // Navigation - Down
    if (key.downArrow && profiles.length > 0) {
      setState((prev) => ({
        ...prev,
        currentIndex: (currentIndex + 1) % profiles.length,
      }));
      return;
    }

    // Use profile - Enter
    if (key.return && profiles.length > 0) {
      const profile = profiles[currentIndex];
      if (profile) {
        const result = profileService.use(profile.id);
        if (result.success) {
          showMessage(`Switched to profile '${profile.name}'`, "success");
          setState((prev) => ({
            ...prev,
            profiles: profileService.list(),
          }));
        }
      }
      return;
    }

    // New profile - N
    if (input.toLowerCase() === "n") {
      setState((prev) => ({ ...prev, view: "create", newProfileName: "" }));
      return;
    }

    // Delete profile - D
    if (input.toLowerCase() === "d" && profiles.length > 0) {
      const profile = profiles[currentIndex];
      if (profile && profile.id === "default") {
        showMessage("Cannot delete the default profile", "error");
        return;
      }
      setState((prev) => ({ ...prev, view: "confirmDelete" }));
      return;
    }
  });

  const { profiles, currentIndex, view, newProfileName, message, messageType } = state;

  // Create profile view
  if (view === "create") {
    return (
      <Box flexDirection="column">
        <Header title="Create New Profile" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text>Profile name:</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; </Text>
            <TextInput
              value={newProfileName}
              onChange={(value) => setState((prev) => ({ ...prev, newProfileName: value }))}
              onSubmit={handleCreateProfile}
            />
          </Box>
        </Box>

        <Box paddingX={1} marginTop={2}>
          <Text dimColor>ENTER to create, ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Confirm delete view
  if (view === "confirmDelete") {
    const profile = profiles[currentIndex];
    return (
      <Box flexDirection="column">
        <Header title="Delete Profile" />

        <Box flexDirection="column" paddingX={1} marginTop={1}>
          <Text color="red">Delete profile '{profile?.name}'?</Text>
          <Box marginTop={1}>
            <Text>Press Y to confirm, N to cancel</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // List view
  const profilesMenuSections = createMenuSections([
    { key: "Enter", label: "Use" },
    { key: "N", label: "New" },
    { key: "D", label: "Delete" },
  ]);

  return (
    <Box flexDirection="column">
      <Header title="Profiles" />

      {/* Message */}
      {message && (
        <Box paddingX={1} marginTop={1}>
          <Text
            color={messageType === "success" ? "green" : messageType === "error" ? "red" : "yellow"}
          >
            {messageType === "success" ? "✓" : messageType === "error" ? "✗" : "ℹ"} {message}
          </Text>
        </Box>
      )}

      {/* Main content: Profiles + Menu side by side */}
      <Box marginTop={1} gap={2}>
        {/* Left panel: Profiles list */}
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {profiles.length === 0 ? (
            <Text dimColor>No profiles configured.</Text>
          ) : (
            profiles.map((profile, idx) => {
              const isCurrent = idx === currentIndex;
              const serverInfo = profile.includesAll
                ? "all servers"
                : `${profile.serverCount} server(s)`;

              return (
                <Box key={profile.id} flexDirection="column" marginBottom={1}>
                  <Box gap={1}>
                    <Text color="cyan">{isCurrent ? "→" : " "}</Text>
                    <Text color={isCurrent ? "cyan" : undefined} bold={isCurrent}>
                      {profile.name}
                    </Text>
                    <Text dimColor>[{profile.id}]</Text>
                    {profile.isActive && <Text color="green">(active)</Text>}
                  </Box>
                  <Box marginLeft={4}>
                    <Text dimColor>{serverInfo}</Text>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        {/* Right panel: Menu */}
        <MenuPanel sections={profilesMenuSections} highlightedView="F" />
      </Box>
    </Box>
  );
}

export default ProfilesScreen;
