import { create } from "zustand";

export interface WalkthroughStep {
  path: string;
  title: string;
  startLine: number;
  endLine: number;
  explanation: string;
  pieces?: { snippet: string; explanation: string }[];
  reviewerTips?: string[];
  challengeQuestions?: string[];
}

interface WalkthroughState {
  isActive: boolean;
  steps: WalkthroughStep[];
  currentStepIndex: number;
  activeSnippet: string | null;

  startWalkthrough: (steps: WalkthroughStep[]) => void;
  stopWalkthrough: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  setActiveSnippet: (snippet: string | null) => void;
}

/**
 * Custom event name used to synchronize walkthrough state between
 * Plasmo content script bundles (sidebar.tsx and overlay.tsx).
 * 
 * Each Plasmo content script is bundled independently, so the Zustand
 * `create()` call produces a separate store instance in each bundle.
 * We bridge them via window CustomEvents dispatched on every mutation.
 */
const SYNC_EVENT = "pr-extension-walkthrough-sync";

interface SyncPayload {
  isActive: boolean;
  steps: WalkthroughStep[];
  currentStepIndex: number;
  activeSnippet: string | null;
}

/** Flag to prevent infinite sync loops (event → set → broadcast → event …) */
let isSyncing = false;

/**
 * Broadcast current state to other content script bundles via CustomEvent.
 */
function broadcastState(state: SyncPayload) {
  if (isSyncing) return;
  window.dispatchEvent(
    new CustomEvent(SYNC_EVENT, { detail: state })
  );
}

export const useWalkthroughStore = create<WalkthroughState>((set, get) => {
  // Listen for sync events from the OTHER content script bundle.
  // When received, apply the state locally without re-broadcasting.
  window.addEventListener(SYNC_EVENT, ((e: CustomEvent<SyncPayload>) => {
    isSyncing = true;
    set({
      isActive: e.detail.isActive,
      steps: e.detail.steps,
      currentStepIndex: e.detail.currentStepIndex,
      activeSnippet: e.detail.activeSnippet,
    });
    isSyncing = false;
  }) as EventListener);

  return {
    isActive: false,
    steps: [],
    currentStepIndex: 0,
    activeSnippet: null,

    startWalkthrough: (steps) => {
      const payload: SyncPayload = {
        isActive: true,
        steps,
        currentStepIndex: 0,
        activeSnippet: null,
      };
      set(payload);
      broadcastState(payload);
    },

    stopWalkthrough: () => {
      const payload: SyncPayload = {
        isActive: false,
        steps: [],
        currentStepIndex: 0,
        activeSnippet: null,
      };
      set(payload);
      broadcastState(payload);
    },

    nextStep: () => {
      const state = get();
      const newIndex = Math.min(state.currentStepIndex + 1, state.steps.length - 1);
      set({ currentStepIndex: newIndex, activeSnippet: null });
      broadcastState({
        isActive: state.isActive,
        steps: state.steps,
        currentStepIndex: newIndex,
        activeSnippet: null,
      });
    },

    prevStep: () => {
      const state = get();
      const newIndex = Math.max(state.currentStepIndex - 1, 0);
      set({ currentStepIndex: newIndex, activeSnippet: null });
      broadcastState({
        isActive: state.isActive,
        steps: state.steps,
        currentStepIndex: newIndex,
        activeSnippet: null,
      });
    },

    goToStep: (index) => {
      const state = get();
      const newIndex = Math.max(0, Math.min(index, state.steps.length - 1));
      set({ currentStepIndex: newIndex, activeSnippet: null });
      broadcastState({
        isActive: state.isActive,
        steps: state.steps,
        currentStepIndex: newIndex,
        activeSnippet: null,
      });
    },

    setActiveSnippet: (snippet) => {
      const state = get();
      set({ activeSnippet: snippet });
      broadcastState({
        isActive: state.isActive,
        steps: state.steps,
        currentStepIndex: state.currentStepIndex,
        activeSnippet: snippet,
      });
    },
  };
});
