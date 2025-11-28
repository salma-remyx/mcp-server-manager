import type { SelectionState } from "../../types/index.js";
import { ConfigRepository } from "./config.repository.js";

export class SelectionService {
  constructor(private readonly repository: ConfigRepository) {}

  getSelectionState(): SelectionState {
    return this.repository.getSelectionState();
  }

  saveSelectionState(state: SelectionState): void {
    this.repository.saveSelectionState(state);
  }

  ensureLocalSelected(id: string): void {
    const state = this.repository.getSelectionState();
    if (!state.local.includes(id)) {
      state.local.push(id);
      this.repository.saveSelectionState(state);
    }
  }

  ensureRemoteSelected(filterId: string): void {
    const state = this.repository.getSelectionState();
    if (!state.remote.includes(filterId)) {
      state.remote.push(filterId);
      this.repository.saveSelectionState(state);
    }
  }
}
