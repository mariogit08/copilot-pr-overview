import type { PlasmoCSConfig } from "plasmo";
import { createRoot } from "react-dom/client";
import React, { useEffect } from "react";
import { useWalkthroughStore } from "../core/walkthrough-state";
import { useScrollSync } from "../hooks/use-scroll-sync";
import { SideWalkthroughPanel } from "../components/SideWalkthroughPanel";
import { GutterMarkers } from "../components/GutterMarkers";
import { GitHubDomAdapter } from "../core/github/dom-adapter";

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*/*/pull/*"],
  all_frames: true
};

/**
 * CRITICAL: Mount directly into document.body instead of Plasmo's default Shadow DOM.
 *
 * By default, Plasmo wraps every content script UI in a <plasmo-csui> element
 * with a Shadow DOM. This breaks our overlay because:
 *   - `position: fixed` inside a Shadow DOM is relative to the shadow host,
 *     not the viewport, so the dimming layer and highlight border are invisible.
 *   - The bottom panel (35vh docked to bottom) won't position correctly.
 *
 * Exporting `getRootContainer` tells Plasmo to use our container instead.
 */
export const getRootContainer = () => {
  const container = document.createElement("div");
  container.id = "pr-extension-overlay-root";
  // The container itself is zero-size and invisible — its children
  // use position:fixed to render wherever they need to on the viewport.
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "0";
  container.style.height = "0";
  container.style.overflow = "visible";
  container.style.zIndex = "9998";
  // Allow clicks to pass through the container to the GitHub page.
  // Interactive children (BottomWalkthroughPanel) re-enable pointer events.
  container.style.pointerEvents = "none";
  document.body.appendChild(container);
  return container;
};

/**
 * When using a custom getRootContainer, Plasmo also needs us to provide
 * a React root factory. We use React 18's createRoot.
 */
export const createRootContainer = (container: HTMLElement) => {
  return createRoot(container);
};

const Overlay = () => {
  const { isActive, steps, currentStepIndex, activeSnippet, stopWalkthrough } = useWalkthroughStore();

  const currentStep = steps[currentStepIndex];
  const rect = useScrollSync(isActive ? currentStep : null);

  useEffect(() => {
    // When the step changes, scroll to the line
    if (isActive && currentStep) {
      GitHubDomAdapter.scrollToLine(currentStep.path, currentStep.startLine);
    }
  }, [isActive, currentStepIndex, currentStep]);

  useEffect(() => {
    // Inject the CSS highlight style into the main document's head.
    // This must be in the main document (not a shadow root) because
    // CSS.highlights applies to text nodes in the host page.
    if (!document.getElementById('pr-extension-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'pr-extension-highlight-style';
      style.textContent = `
        ::highlight(pr-extension-highlight) {
          background-color: rgba(210, 153, 34, 0.4) !important;
          text-decoration: underline dashed #d29922 !important;
          text-decoration-thickness: 2px !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Highlight specific tokens when hovering over a piece in the bottom panel
    if (isActive && currentStep && activeSnippet) {
      let isMounted = true;
      GitHubDomAdapter.getSnippetRanges(currentStep.path, currentStep.startLine, currentStep.endLine, activeSnippet)
        .then(ranges => {
          if (!isMounted) return;

          if (ranges.length > 0 && 'highlights' in CSS) {
            const highlight = new (window as any).Highlight(...ranges);
            (CSS as any).highlights.set('pr-extension-highlight', highlight);
          }
        });
      return () => {
        isMounted = false;
        if ('highlights' in CSS) {
          (CSS as any).highlights.delete('pr-extension-highlight');
        }
      };
    } else {
      if ('highlights' in CSS) {
        (CSS as any).highlights.delete('pr-extension-highlight');
      }
    }
  }, [isActive, currentStep, activeSnippet]);

  useEffect(() => {
    // Add ESC key listener to exit walkthrough
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isActive) {
        stopWalkthrough();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, stopWalkthrough]);

  if (!isActive) return null;

  // The clipPath creates a "hole" in our dimming layer where the code is
  const clipPathStyle = rect
    ? `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%,
        0% 0%,
        ${rect.left - 4}px ${rect.top - 4}px,
        ${rect.left + rect.width + 4}px ${rect.top - 4}px,
        ${rect.left + rect.width + 4}px ${rect.top + rect.height + 4}px,
        ${rect.left - 4}px ${rect.top + rect.height + 4}px,
        ${rect.left - 4}px ${rect.top - 4}px
      )`
    : 'none';

  return (
    <>
      {/* Focus Mode Dimming Layer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: rect ? "rgba(0, 0, 0, 0.4)" : "transparent",
          clipPath: clipPathStyle,
          pointerEvents: "none", // Let clicks pass through
          zIndex: 9998,
          transition: "clip-path 0.2s ease-in-out",
        }}
      />

      {/* Highlight Border (drawn directly over the rect) */}
      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            border: "2px solid #2da44e", // GitHub green
            borderRadius: "4px",
            pointerEvents: "none",
            zIndex: 9999,
            transition: "all 0.2s ease-in-out",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.2)"
          }}
        />
      )}

      {/* Gutter markers for pieces */}
      <GutterMarkers />

      {/* The side docked annotation panel */}
      <SideWalkthroughPanel />
    </>
  );
};

export default Overlay;
