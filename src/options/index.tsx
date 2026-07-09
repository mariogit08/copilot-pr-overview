import React, { useEffect, useState } from "react";
import { useSettingsStore } from "../store/settings";
import { providers } from "../core/ai-providers";
import cssText from "data-text:~style.css";

function OptionsIndex() {
  const { config, setConfig, load } = useSettingsStore();
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const handleTestConnection = async () => {
    setTestStatus("testing");
    const provider = providers[config.id];
    if (provider) {
      const ok = await provider.testConnection(config);
      setTestStatus(ok ? "success" : "error");
    } else {
      setTestStatus("error");
    }
  };

  return (
    <>
      <style>{cssText}</style>
      <div className="p-8 max-w-2xl mx-auto dark:bg-slate-900 dark:text-white min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Copilot PR Overview - Settings</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">AI Provider</label>
          <select 
            value={config.id}
            onChange={(e) => setConfig({ id: e.target.value })}
            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
          >
            {Object.values(providers).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">API Key</label>
          <div className="flex">
            <input 
              type={showKey ? "text" : "password"}
              value={config.apiKey || ""}
              onChange={(e) => setConfig({ apiKey: e.target.value })}
              className="flex-1 p-2 border rounded-l dark:bg-slate-800 dark:border-slate-700"
            />
            <button 
              onClick={() => setShowKey(!showKey)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-l-0 rounded-r hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <input 
              type="text"
              value={config.model || ""}
              onChange={(e) => setConfig({ model: e.target.value })}
              className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Tokens</label>
            <input 
              type="number"
              value={config.maxTokens || 4096}
              onChange={(e) => setConfig({ maxTokens: Number(e.target.value) })}
              className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Base URL (Optional)</label>
          <input 
            type="text"
            value={config.baseUrl || ""}
            onChange={(e) => setConfig({ baseUrl: e.target.value })}
            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
            placeholder="e.g. https://api.groq.com/openai/v1"
          />
        </div>

        <div className="pt-4 flex items-center gap-4 border-t dark:border-slate-700">
          <button 
            onClick={handleTestConnection}
            disabled={testStatus === "testing"}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {testStatus === "testing" ? "Testing..." : "Test Connection"}
          </button>
          
          {testStatus === "success" && <span className="text-green-500">✓ Connection Successful</span>}
          {testStatus === "error" && <span className="text-red-500">✗ Connection Failed</span>}
        </div>
      </div>
      </div>
    </>
  );
}

export default OptionsIndex;
