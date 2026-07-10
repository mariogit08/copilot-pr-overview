import React, { useState } from 'react';
import { useWalkthroughStore } from "../core/walkthrough-state";
import { usePiecesSync } from "../hooks/use-pieces-sync";

export const GutterMarkers = () => {
  const { isActive, steps, currentStepIndex, setActiveSnippet } = useWalkthroughStore();
  const currentStep = isActive ? steps[currentStepIndex] : null;
  const rects = usePiecesSync(currentStep);
  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  if (!isActive || !currentStep || rects.length === 0) return null;

  return (
    <>
      {rects.map((rect, i) => {
        // Gutter cells are usually 40-50px wide. We position the marker near the right edge of the td.
        const markerSize = 20;
        const markerLeft = rect.left + rect.width - markerSize - 4; // 4px padding from the right edge
        const markerTop = rect.top + (rect.height / 2) - (markerSize / 2); // centered vertically

        const piece = rect.pieceIndex !== undefined ? currentStep.pieces?.[rect.pieceIndex] : undefined;
        const isHovered = activeMarker === i;

        return (
          <div key={i} style={{ zIndex: 10000 }}>
            {/* The Marker Icon */}
            <div
              onMouseEnter={() => {
                setActiveMarker(i);
                if (piece) setActiveSnippet(piece.snippet);
              }}
              onMouseLeave={() => {
                setActiveMarker(null);
                setActiveSnippet(null);
              }}
              onClick={() => {
                const newActive = isHovered ? null : i;
                setActiveMarker(newActive);
                if (piece) setActiveSnippet(newActive !== null ? piece.snippet : null);
              }}
              style={{
                position: 'fixed',
                left: markerLeft,
                top: markerTop,
                width: `${markerSize}px`,
                height: `${markerSize}px`,
                backgroundColor: '#0969da',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 0 0 2px #ffffff, 0 1px 3px rgba(0,0,0,0.3)',
                zIndex: 10001,
                pointerEvents: 'auto',
              }}
              title="Click or hover to view explanation"
            >
              i
            </div>

            {/* The Popover */}
            {isHovered && (
              <div
                onMouseEnter={() => {
                  setActiveMarker(i);
                  if (piece) setActiveSnippet(piece.snippet);
                }}
                onMouseLeave={() => {
                  setActiveMarker(null);
                  setActiveSnippet(null);
                }}
                style={{
                  position: 'fixed',
                  left: markerLeft - 320 - 12,
                  top: markerTop - 10,
                  width: '320px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d0d7de',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(140, 149, 159, 0.2)',
                  padding: '12px',
                  zIndex: 10002,
                  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
                  pointerEvents: 'auto',
                }}
              >
                {piece ? (
                  <>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0969da', marginBottom: '8px', wordBreak: 'break-all', backgroundColor: '#f6f8fa', padding: '4px 6px', borderRadius: '4px' }}>
                      {piece.snippet}
                    </div>
                    <div style={{ fontSize: '13px', color: '#24292f', lineHeight: '1.5' }}>
                      {piece.explanation}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '13px', color: '#24292f', lineHeight: '1.5' }}>
                    {currentStep.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
