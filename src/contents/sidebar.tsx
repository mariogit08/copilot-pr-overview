import cssText from "data-text:~style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"
import { useSettingsStore } from "../store/settings"
import { providers } from "../core/ai-providers"
import { buildPRContext } from "../core/context-builder/github"
import { getCacheKey, getCachedAnalysis, setCachedAnalysis } from "../store/cache"
import type { AnalysisResult } from "../core/types"
import { useWalkthroughStore } from "../core/walkthrough-state"

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*/*/pull/*"],
  css: ["../style.css"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

// Parses GitHub URL to extract owner, repo, pull number
const getPRInfo = () => {
  const match = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], pullNumber: parseInt(match[3], 10) };
};

const Sidebar = () => {
  const { config: providerConfig, load } = useSettingsStore()
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingChunk, setStreamingChunk] = useState<string>("")
  const [isExpanded, setIsExpanded] = useState(true)

  // Guided Review State (from store)
  const {
    isActive: isGuidedReviewActive,
    currentStepIndex,
    startWalkthrough,
    stopWalkthrough,
    nextStep,
    prevStep
  } = useWalkthroughStore()

  useEffect(() => {
    load();
  }, [load]);

  const startGuidedReview = () => {
    if (result && result.steps) {
      startWalkthrough(result.steps.map(step => ({
        path: step.file,
        title: step.title,
        startLine: step.startLine,
        endLine: step.endLine,
        explanation: step.description,
        pieces: step.pieces,
        reviewerTips: step.reviewerTips,
        challengeQuestions: step.challengeQuestions
      })));
    }
  };

  const exitGuidedReview = () => {
    stopWalkthrough();
  };

  useEffect(() => {
    if (isGuidedReviewActive) {
      const filesTab = document.querySelector('a.tabnav-tab[href$="/files"]');
      if (filesTab && !filesTab.classList.contains('selected')) {
        (filesTab as HTMLElement).click();
      }
    }
  }, [isGuidedReviewActive, currentStepIndex]);

  // We no longer manually mutate the DOM here.
  // The global Overlay component (in contents/overlay.tsx) reacts to 
  // the WalkthroughStore state and handles dimming, highlight, and scrolling.

  const handleAnalyze = async (force: boolean = false) => {
    const info = getPRInfo();
    if (!info) {
      setError("Could not determine PR info from URL.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setStreamingChunk("");

    try {
      // 1. Context Build
      const context = await buildPRContext(info.owner, info.repo, info.pullNumber);

      // 2. Check Cache
      const cacheKey = getCacheKey(info.owner, info.repo, info.pullNumber, context.latestCommitSha);

      if (!force) {
        const cached = await getCachedAnalysis(cacheKey);
        if (cached) {
          setResult(cached);
          setAnalyzing(false);
          return;
        }
      }

      // 3. Provider Call
      const provider = providers[providerConfig.id];
      if (!provider) throw new Error("Provider not configured");

      const analysis = await provider.analyzePullRequest(context, providerConfig, (chunk) => {
        setStreamingChunk(prev => prev + chunk);
      });

      // 4. Save and Show
      await setCachedAnalysis(cacheKey, analysis);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Failed to analyze PR");
    } finally {
      setAnalyzing(false);
      setStreamingChunk("");
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed right-4 top-24 z-[9999] bg-blue-600 text-white p-2 rounded shadow-lg hover:bg-blue-700"
      >
        <span>⚠️</span>
      </button>
    )
  }

  // Hide the sidebar completely when the guided review is active so it doesn't distract the user
  if (isGuidedReviewActive) {
    return null;
  }

  return (
    <div className="fixed right-4 top-24 w-[400px] max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[9999] flex flex-col text-sm">
      <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-t-lg sticky top-0 z-10">
        <h2 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <span>⚠️</span>
          Copilot PR Overview
          <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-1">v1.3.3</span>
        </h2>
        <button onClick={() => setIsExpanded(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          ✕
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto text-slate-700 dark:text-slate-300">
        {!result && !analyzing && (
          <div className="text-center py-8">
            <p className="mb-4 text-slate-500">Analyze this PR to get a high-level overview, architecture impact, and review suggestions.</p>
            <button
              onClick={() => handleAnalyze()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded w-full transition-colors shadow-sm"
            >
              Analyze PR
            </button>
          </div>
        )}

        {analyzing && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">Analyzing Pull Request...</span>
            </div>
            {streamingChunk && (
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs font-mono break-words h-24 overflow-hidden relative">
                {streamingChunk.slice(-200)}...
                <div className="absolute inset-0 bg-gradient-to-t from-slate-100/0 dark:from-slate-800/0 via-slate-100/50 dark:via-slate-800/50 to-slate-100 dark:to-slate-800 pointer-events-none"></div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {result && !analyzing && (
          <div className="space-y-6">
            {isGuidedReviewActive && result.steps ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase">
                  <span>Step {currentStepIndex + 1} of {result.steps.length}</span>
                  <span className={`px-2 py-1 rounded text-white ${result.steps[currentStepIndex].importance === 'high' ? 'bg-red-500' :
                      result.steps[currentStepIndex].importance === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}>
                    {result.steps[currentStepIndex].importance}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {result.steps[currentStepIndex].title}
                </h3>

                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800">
                  {result.steps[currentStepIndex].description}
                </p>

                <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                  File: <span className="font-mono">{result.steps[currentStepIndex].file}</span><br />
                  Lines: {result.steps[currentStepIndex].startLine} - {result.steps[currentStepIndex].endLine}
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={prevStep}
                    disabled={currentStepIndex === 0}
                    className="flex-1 py-2 px-4 rounded border border-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-white transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={currentStepIndex === result.steps.length - 1}
                    className="flex-1 py-2 px-4 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    onClick={exitGuidedReview}
                    className="w-full py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline text-sm transition-colors"
                  >
                    Exit Guided Review
                  </button>
                </div>
              </div>
            ) : (
              <>
                {result.steps && result.steps.length > 0 && (
                  <div className="mb-2">
                    <button
                      onClick={startGuidedReview}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded shadow-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>🧭</span> Start Guided Review
                    </button>
                  </div>
                )}
                <section>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>✅</span> Purpose
                  </h3>
                  <p className="leading-relaxed">{result.purpose}</p>
                </section>

                <section>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">What Changed</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.summary.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </section>

                {result.architecture && (
                  <section>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Architecture</h3>
                    <p className="mb-2 leading-relaxed">{result.architecture.description}</p>
                    {result.architecture.diagram && (
                      <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-x-auto text-xs text-slate-800 dark:text-slate-300">
                        {result.architecture.diagram}
                      </pre>
                    )}
                  </section>
                )}

                <section>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>🛡️</span> Risks
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-amber-700 dark:text-amber-400">
                    {result.risks.map((risk, i) => <li key={i}>{risk}</li>)}
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>📄</span> Review Order
                  </h3>
                  <div className="space-y-3 mt-3">
                    {result.reviewOrder.map((order, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
                        <div className="font-medium text-slate-900 dark:text-white break-all flex gap-2">
                          <span className="text-slate-400">{i + 1}.</span> {order.file}
                        </div>
                        <div className="text-xs mt-1 text-slate-600 dark:text-slate-400 pl-5">{order.reason}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="pt-2">
                  <button
                    onClick={() => handleAnalyze(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline w-full text-center py-2 bg-blue-50 dark:bg-blue-900/20 rounded"
                  >
                    Re-analyze PR
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
