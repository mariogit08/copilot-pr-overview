import React from "react";
import { useWalkthroughStore } from "../core/walkthrough-state";

interface FloatingAnnotationProps {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const FloatingAnnotation: React.FC<FloatingAnnotationProps> = ({ top, left, width, height }) => {
  const { steps, currentStepIndex, nextStep, prevStep, stopWalkthrough } = useWalkthroughStore();
  const currentStep = steps[currentStepIndex];

  if (!currentStep) return null;

  // Position the annotation just below the highlight box
  const annotationTop = top + height + 10;
  
  // Center horizontally relative to the highlight, but prevent it from going off-screen
  // We'll set a fixed width of 400px for the card
  const cardWidth = 400;
  let annotationLeft = left + (width / 2) - (cardWidth / 2);
  
  // Basic bounds checking (assuming window width is available)
  if (typeof window !== 'undefined') {
    if (annotationLeft < 20) annotationLeft = 20;
    if (annotationLeft + cardWidth > window.innerWidth - 20) {
      annotationLeft = window.innerWidth - cardWidth - 20;
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: `${annotationTop}px`,
        left: `${annotationLeft}px`,
        width: `${cardWidth}px`,
        backgroundColor: 'var(--color-bg-default, #ffffff)',
        border: '1px solid var(--color-border-default, #d0d7de)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(140, 149, 159, 0.2)',
        padding: '16px',
        zIndex: 10000, // Above the focus dimming layer
        color: 'var(--color-fg-default, #24292f)',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--color-fg-muted, #57606a)' }}>
        <span>Step {currentStepIndex + 1} of {steps.length}</span>
        <button 
          onClick={stopWalkthrough}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-fg-muted, #57606a)' }}
          aria-label="Close walkthrough"
        >
          ✕
        </button>
      </div>

      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-fg-default, #24292f)' }}>
        {currentStep.title}
      </div>
      
      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
        <div style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '16px', color: 'var(--color-fg-default, #24292f)' }}>
          {currentStep.explanation}
        </div>

        {(currentStep.pieces && currentStep.pieces.length > 0) && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentStep.pieces.map((piece, i) => (
              <div 
                key={i} 
                onMouseEnter={() => {
                  useWalkthroughStore.getState().setActiveSnippet(piece.snippet);
                }}
                onMouseLeave={() => {
                  useWalkthroughStore.getState().setActiveSnippet(null);
                }}
                style={{
                  padding: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d0d7de',
                  borderRadius: '6px',
                  cursor: 'default',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#0969da';
                  e.currentTarget.style.boxShadow = '0 0 0 1px #0969da';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#d0d7de';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                }}
              >
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0969da', marginBottom: '6px', wordBreak: 'break-all' }}>
                  {piece.snippet}
                </div>
                <div style={{ fontSize: '13px', color: '#57606a', lineHeight: '1.4' }}>
                  {piece.explanation}
                </div>
              </div>
            ))}
          </div>
        )}

        {(currentStep.reviewerTips && currentStep.reviewerTips.length > 0) && (
          <details style={{ marginBottom: '12px', backgroundColor: '#f6f8fa', borderRadius: '6px', borderLeft: '4px solid #0969da', cursor: 'pointer' }}>
            <summary style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 'bold', color: '#0969da', userSelect: 'none' }}>
              💡 Tips for Reviewer
            </summary>
            <ul style={{ fontSize: '13px', margin: '0', padding: '0 12px 12px 28px', color: '#24292f' }}>
              {currentStep.reviewerTips.map((tip, i) => <li key={i} style={{ marginBottom: '4px' }}>{tip}</li>)}
            </ul>
          </details>
        )}

        {(currentStep.challengeQuestions && currentStep.challengeQuestions.length > 0) && (
          <details style={{ marginBottom: '16px', backgroundColor: '#fff8c5', borderRadius: '6px', borderLeft: '4px solid #bf8700', cursor: 'pointer' }}>
            <summary style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 'bold', color: '#9a6700', userSelect: 'none' }}>
              ❓ Challenge the Code
            </summary>
            <ul style={{ fontSize: '13px', margin: '0', padding: '0 12px 12px 28px', color: '#57606a' }}>
              {currentStep.challengeQuestions.map((q, i) => <li key={i} style={{ marginBottom: '4px' }}>{q}</li>)}
            </ul>
          </details>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          style={{
            padding: '5px 16px',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '20px',
            cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
            border: '1px solid var(--color-btn-border, rgba(27, 31, 36, 0.15))',
            borderRadius: '6px',
            backgroundColor: 'var(--color-btn-bg, #f6f8fa)',
            color: currentStepIndex === 0 ? 'var(--color-fg-muted, #57606a)' : 'var(--color-fg-default, #24292f)',
          }}
        >
          Previous
        </button>
        <button
          onClick={currentStepIndex === steps.length - 1 ? stopWalkthrough : nextStep}
          style={{
            padding: '5px 16px',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '20px',
            cursor: 'pointer',
            border: '1px solid var(--color-btn-primary-border, rgba(27, 31, 36, 0.15))',
            borderRadius: '6px',
            backgroundColor: 'var(--color-btn-primary-bg, #2da44e)',
            color: '#ffffff',
          }}
        >
          {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};
