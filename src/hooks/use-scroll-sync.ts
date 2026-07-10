import { useState, useEffect, useCallback } from "react";
import { GitHubDomAdapter } from "../core/github/dom-adapter";
import type { WalkthroughStep } from "../core/walkthrough-state";

export interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Hook to synchronize an overlay position with a target DOM element's exact position.
 * It uses both ResizeObserver (for layout shifts) and scroll listeners.
 */
export function useScrollSync(step: WalkthroughStep | null) {
  const [rect, setRect] = useState<HighlightRect | null>(null);

  const updateRect = useCallback(async () => {
    if (!step || step.startLine === null || step.endLine === null) {
      setRect(null);
      return;
    }

    let minLine = step.startLine;
    let maxLine = step.endLine;

    if (step.pieces && step.pieces.length > 0) {
      for (const piece of step.pieces) {
        const line = await GitHubDomAdapter.getSnippetLine(step.path, step.startLine, step.endLine, piece.snippet);
        if (line !== null) {
          minLine = Math.min(minLine, line);
          maxLine = Math.max(maxLine, line);
        }
      }
    }

    const domRect = await GitHubDomAdapter.getLineRect(step.path, minLine, maxLine);
    
    if (domRect) {
      setRect({
        top: domRect.top, // relative to viewport
        left: domRect.left,
        width: domRect.width,
        height: domRect.height
      });
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    updateRect();
    
    // Polling interval to catch lazy loaded DOM elements
    const pollInterval = window.setInterval(updateRect, 500);

    // Debounced or throttled scroll event listener
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateRect();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    // Watch for layout shifts (e.g., expanding a diff chunk)
    const resizeObserver = new ResizeObserver(() => {
      handleScroll();
    });

    // Optionally observe the entire document body for shifts, or specific diff containers if known
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      resizeObserver.disconnect();
      window.clearInterval(pollInterval);
    };
  }, [updateRect]);

  return rect;
}
