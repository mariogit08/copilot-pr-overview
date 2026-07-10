import React, { useEffect, useState } from 'react';
import { useWalkthroughStore } from "../core/walkthrough-state";

export const SideWalkthroughPanel = () => {
  const { isActive, steps, currentStepIndex, stopWalkthrough, nextStep, prevStep } = useWalkthroughStore();
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('pr-extension-panel-collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pr-extension-panel-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Handle dynamic margin-right on body when the panel is shown, so diff isn't covered
  useEffect(() => {
    if (isActive && !isCollapsed) {
      document.body.style.paddingRight = '344px'; // 320px width + 24px margin
    } else {
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.paddingRight = '';
    };
  }, [isActive, isCollapsed]);

  if (!isActive || !steps[currentStepIndex]) return null;
  const currentStep = steps[currentStepIndex];

  // If collapsed, we show a small badge
  if (isCollapsed) {
    return (
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid #d0d7de',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '8px 12px',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
        pointerEvents: 'auto'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#57606a', textTransform: 'uppercase' }}>
          Step {currentStepIndex + 1} of {steps.length}
        </div>
        <button 
          onClick={() => setIsCollapsed(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0969da', fontSize: '13px', padding: 0 }}
        >
          Expand
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      width: '320px',
      maxHeight: 'calc(100vh - 48px)',
      backgroundColor: '#ffffff',
      border: '1px solid #d0d7de',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(140, 149, 159, 0.2)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
      boxSizing: 'border-box',
      pointerEvents: 'auto'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #d0d7de',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f6f8fa',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Step {currentStepIndex + 1} of {steps.length}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setIsCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#57606a', fontSize: '12px', padding: '4px', fontWeight: 'bold' }} title="Minimize">
            —
          </button>
          <button onClick={stopWalkthrough} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#57606a', fontSize: '14px', padding: '4px' }} title="Close">
            ✕
          </button>
        </div>
      </div>

      <div style={{
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', color: '#24292f' }}>
          {currentStep.title}
        </h2>

        <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#24292f' }}>
          {currentStep.explanation}
        </div>

        {(currentStep.reviewerTips && currentStep.reviewerTips.length > 0) && (
          <details style={{ backgroundColor: '#f6f8fa', borderRadius: '6px', borderLeft: '4px solid #0969da', cursor: 'pointer' }}>
            <summary style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 'bold', color: '#0969da', userSelect: 'none' }}>
              💡 Tips for Reviewer
            </summary>
            <ul style={{ fontSize: '13px', margin: '0', padding: '0 12px 12px 28px', color: '#24292f' }}>
              {currentStep.reviewerTips.map((tip, i) => <li key={i} style={{ marginBottom: '4px' }}>{tip}</li>)}
            </ul>
          </details>
        )}

        {(currentStep.challengeQuestions && currentStep.challengeQuestions.length > 0) && (
          <details style={{ backgroundColor: '#fff8c5', borderRadius: '6px', borderLeft: '4px solid #bf8700', cursor: 'pointer' }}>
            <summary style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 'bold', color: '#9a6700', userSelect: 'none' }}>
              ❓ Challenge the Code
            </summary>
            <ul style={{ fontSize: '13px', margin: '0', padding: '0 12px 12px 28px', color: '#57606a' }}>
              {currentStep.challengeQuestions.map((q, i) => <li key={i} style={{ marginBottom: '4px' }}>{q}</li>)}
            </ul>
          </details>
        )}
      </div>

      <div style={{
        padding: '16px',
        borderTop: '1px solid #d0d7de',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          style={{ flex: 1, padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d0d7de', backgroundColor: currentStepIndex === 0 ? '#f6f8fa' : '#ffffff', color: currentStepIndex === 0 ? '#8c959f' : '#24292f', cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 500 }}
        >
          Previous
        </button>
        <button
          onClick={currentStepIndex === steps.length - 1 ? stopWalkthrough : nextStep}
          style={{ flex: 1, padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: 'none', backgroundColor: '#2da44e', color: '#ffffff', cursor: 'pointer', fontWeight: 500 }}
        >
          {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};
