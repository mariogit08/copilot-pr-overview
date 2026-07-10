import { useState, useEffect, useCallback } from "react";
import { GitHubDomAdapter } from "../core/github/dom-adapter";
import type { WalkthroughStep } from "../core/walkthrough-state";

export interface MarkerRect {
  top: number;
  left: number;
  width: number;
  height: number;
  pieceIndex?: number; // if undefined, it's a step-level marker
}

/**
 * Hook to synchronize gutter marker positions for the pieces of the current step.
 */
export function usePiecesSync(step: WalkthroughStep | null) {
  const [rects, setRects] = useState<MarkerRect[]>([]);

  const updateRects = useCallback(async () => {
    if (!step) {
      setRects([]);
      return;
    }

    const { path, startLine, endLine, pieces } = step;
    const newRects: MarkerRect[] = [];
    
    if (pieces && pieces.length > 0) {
      for (let i = 0; i < pieces.length; i++) {
        const line = await GitHubDomAdapter.getSnippetLine(path, startLine, endLine, pieces[i].snippet);
        if (line !== null) {
          let rect = await GitHubDomAdapter.getLineNumberRect(path, line, 'right');
          if (!rect) {
            rect = await GitHubDomAdapter.getLineNumberRect(path, line, 'left');
          }
          
          if (rect) {
            newRects.push({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              pieceIndex: i
            });
          }
        }
      }
    } else {
      // Step-level marker if no pieces
      let rect = await GitHubDomAdapter.getLineNumberRect(path, startLine, 'right');
      if (!rect) {
        rect = await GitHubDomAdapter.getLineNumberRect(path, startLine, 'left');
      }
      if (rect) {
        newRects.push({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }
    }

    setRects(newRects);
  }, [step]);

  useEffect(() => {
    updateRects();
    
    // Polling interval to catch lazy loaded DOM elements
    const pollInterval = window.setInterval(updateRects, 500);

    // Debounced or throttled scroll event listener
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateRects();
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

    // Optionally observe the entire document body for shifts
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      resizeObserver.disconnect();
      window.clearInterval(pollInterval);
    };
  }, [updateRects]);

  return rects;
}
