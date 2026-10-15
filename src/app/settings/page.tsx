"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Sliders,
  Building2,
  ShieldAlert,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const [tab, setTab] = useState<"SYMBOLS" | "SCHOOL" | "AUDIT" | "GEMINI_AI">("SYMBOLS");
  const [symbols, setSymbols] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [schoolSuccess, setSchoolSuccess] = useState(false);

  // Gemini AI state
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState("");
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [geminiMaskedKey, setGeminiMaskedKey] = useState("");
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiStatusMsg, setGeminiStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // School profile state
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
  });

  // New symbol state
  const [newSymbol, setNewSymbol] = useState({
    symbol: "",
    mappedStatus: "PRESENT" as const,
    description: "",
  });

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/settings/symbols").then((r) => r.json()),
      fetch("/api/settings/school").then((r) => r.json()),
      fetch("/api/audit").then((r) => r.json()),
      fetch("/api/settings/ai").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([symData, schData, audData, aiData]) => {
        setSymbols(symData.symbols || []);
        if (schData.school) {
          setSchoolForm({
            name: schData.school.name || "",
            code: schData.school.code || "",
            address: schData.school.address || "",
            phone: schData.school.phone || "",
            email: schData.school.email || "",
          });
        }
        setAuditLogs(audData.logs || []);
        if (aiData) {
          setGeminiConfigured(!!aiData.configured);
          setGeminiMaskedKey(aiData.maskedKey || "");
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestGeminiKey = async () => {
    const keyToTest = geminiApiKeyInput.trim();
    if (!keyToTest) {
      setGeminiStatusMsg({ type: "error", text: "Please enter a Gemini API key to test." });
      return;
    }
    setGeminiTesting(true);
    setGeminiStatusMsg(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest, testOnly: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeminiStatusMsg({ type: "success", text: "Connection verified! Key is valid and active with Gemini AI." });
      } else {
        setGeminiStatusMsg({ type: "error", text: data.error || "Failed to validate Gemini API key." });
      }
    } catch (err: any) {
      setGeminiStatusMsg({ type: "error", text: err.message || "Failed to connect to Gemini API." });
    } finally {
      setGeminiTesting(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    const keyToSave = geminiApiKeyInput.trim();
    if (!keyToSave) {
      setGeminiStatusMsg({ type: "error", text: "Please enter a valid Gemini API key to save." });
      return;
    }
    setGeminiSaving(true);
    setGeminiStatusMsg(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToSave }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeminiConfigured(true);
        setGeminiMaskedKey(keyToSave.slice(0, 4) + "••••••••••••" + keyToSave.slice(-4));
        setGeminiApiKeyInput("");
        setGeminiStatusMsg({ type: "success", text: "Gemini API key saved! Multimodal AI vision is now enabled." });
      } else {
        setGeminiStatusMsg({ type: "error", text: data.error || "Failed to save key." });
      }
    } catch (err: any) {
      setGeminiStatusMsg({ type: "error", text: err.message || "Failed to save key." });
    } finally {
      setGeminiSaving(false);
    }
  };

  const handleUpdateSymbolStatus = (
    index: number,
    newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW"
  ) => {
    const updated = [...symbols];
    updated[index].mappedStatus = newStatus;
    setSymbols(updated);
  };

  const handleAddSymbol = () => {
    if (!newSymbol.symbol) return;
    const added = {
      id: `sym_${Date.now()}`,
      symbol: newSymbol.symbol.trim(),
      mappedStatus: newSymbol.mappedStatus,
      description: newSymbol.description || "Custom symbol rule",
      isDefault: false,
    };
    setSymbols([...symbols, added]);
    setNewSymbol({ symbol: "", mappedStatus: "PRESENT", description: "" });
  };

  const handleDeleteSymbol = (index: number) => {
    const updated = symbols.filter((_, i) => i !== index);
    setSymbols(updated);
  };

  const handleSaveSymbols = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/settings/symbols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchool = async () => {
    setSaving(true);
    setSchoolSuccess(false);
    try {
      const res = await fetch("/api/settings/school", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolForm),
      });
      if (res.ok) {
        setSchoolSuccess(true);
        setTimeout(() => setSchoolSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Settings &amp; Symbol Rules
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure real handwritten symbol interpretations, school profile, and audit logs.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center p-1 bg-slate-200/80 rounded-xl">
          <button
            onClick={() => setTab("SYMBOLS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "SYMBOLS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Symbol Mapping
          </button>
          <button
            onClick={() => setTab("SCHOOL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "SCHOOL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> School Info
          </button>
          <button
            onClick={() => setTab("AUDIT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "AUDIT" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Audit Trail
          </button>
          <button
            onClick={() => setTab("GEMINI_AI")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "GEMINI_AI" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" /> AI Vision (Gemini)
          </button>
        </div>
      </div>

      {/* SYMBOL CONFIGURATION TAB */}
      {tab === "SYMBOLS" && (
        <div className="space-y-5">
          <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-4 text-xs text-sky-800 flex items-start gap-3">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Handwritten Attendance Symbol Policy</p>
              <p className="text-sky-700 mt-0.5 leading-relaxed">
                The AI OCR pipeline classifies raw handwriting marks (e.g. ✓, A, P, L, E) and applies your school&apos;s custom mapping below. Original recognized marks are always preserved separately in the database for complete audit fidelity.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Configured Attendance Symbols</h3>
              <button
                onClick={handleSaveSymbols}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>

            {saveSuccess && (
              <div className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Symbol configuration saved successfully!</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4 w-20">Symbol</th>
                    <th className="py-2.5 px-4">Interpreted Status</th>
                    <th className="py-2.5 px-4">Description / Rule</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {symbols.map((sym, idx) => (
                    <tr key={sym.id || idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-extrabold text-base text-slate-900">
                        {sym.symbol}
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={sym.mappedStatus}
                          onChange={(e) =>
                            handleUpdateSymbolStatus(idx, e.target.value as any)
                          }
                          className="text-xs font-bold p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="PRESENT">✓ Present</option>
                          <option value="ABSENT">A Absent</option>
                          <option value="LATE">L Late (Tardy)</option>
                          <option value="EXCUSED">E Excused</option>
                          <option value="NEEDS_REVIEW">? Needs Review</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium text-xs">
                        {sym.description}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!sym.isDefault && (
                          <button
                            onClick={() => handleDeleteSymbol(idx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                            title="Remove Symbol Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Custom Symbol Section */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3 text-xs">
              <input
                type="text"
                placeholder="Symbol (e.g. T or M)"
                maxLength={3}
                value={newSymbol.symbol}
                onChange={(e) => setNewSymbol({ ...newSymbol, symbol: e.target.value })}
                className="w-24 p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-center"
              />
              <select
                value={newSymbol.mappedStatus}
                onChange={(e) =>
                  setNewSymbol({ ...newSymbol, mappedStatus: e.target.value as any })
                }
                className="p-2 bg-white border border-slate-200 rounded-lg font-bold"
              >
                <option value="PRESENT">✓ Present</option>
                <option value="ABSENT">A Absent</option>
                <option value="LATE">L Late</option>
                <option value="EXCUSED">E Excused</option>
              </select>
              <input
                type="text"
                placeholder="Description / Rule"
                value={newSymbol.description}
                onChange={(e) => setNewSymbol({ ...newSymbol, description: e.target.value })}
                className="flex-1 p-2 bg-white border border-slate-200 rounded-lg"
              />
              <button
                onClick={handleAddSymbol}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white font-bold shrink-0 hover:bg-slate-800"
              >
                + Add Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHOOL PROFILE TAB */}
      {tab === "SCHOOL" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-sm text-slate-900">School Profile &amp; Organization Identity</h3>

          {schoolSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>School profile updated in database!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">School Name</label>
              <input
                type="text"
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">School Code / License</label>
              <input
                type="text"
                value={schoolForm.code}
                onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Campus Physical Address</label>
              <input
                type="text"
                value={schoolForm.address}
                onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={schoolForm.phone}
                onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Administrative Email</label>
              <input
                type="email"
                value={schoolForm.email}
                onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveSchool}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {tab === "AUDIT" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">System Security &amp; Activity Audit Log</h3>
            <span className="text-[11px] text-slate-400">Prisma Database Log</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">{log.action}</p>
                    <p className="text-slate-500 text-[11px]">
                      Entity: {log.entityType} {log.entityId ? `(${log.entityId})` : ""} {log.details ? `• ${log.details}` : ""}
                    </p>
                  </div>
                  <span className="text-slate-400 text-[11px] shrink-0 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No activity logs recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* GEMINI AI CONFIGURATION TAB */}
      {tab === "GEMINI_AI" && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-200 rounded-2xl p-5 text-xs text-purple-900 flex items-start gap-3 shadow-xs">
            <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-purple-950">Google Gemini Multimodal AI Vision Integration</p>
              <p className="text-purple-800 leading-relaxed">
                Connect your Google Gemini API key to unlock state-of-the-art vision recognition on real paper attendance sheets. Gemini analyzes handwritten student names, sexes, column structures, and roll-call marks (✓, A, P, L, E) directly from uploaded smartphone photos or scans.
              </p>
            </div>
          </div>

          {/* Connection Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">API Key &amp; Connection Status</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your API key is securely saved to your local environment file (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">.env</code>).
                </p>
              </div>
              <div>
                {geminiConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Not Connected
                  </span>
                )}
              </div>
            </div>

            {/* Status message */}
            {geminiStatusMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  geminiStatusMsg.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {geminiStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{geminiStatusMsg.text}</span>
              </div>
            )}

            {/* Active Key Display if Configured */}
            {geminiConfigured && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">ACTIVE API KEY</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{geminiMaskedKey}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold block text-[11px]">DEFAULT MODEL</span>
                  <span className="font-bold text-purple-700 text-xs">gemini-1.5-flash / gemini-2.0-flash</span>
                </div>
              </div>
            )}

            {/* Input field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                {geminiConfigured ? "Update or Replace Gemini API Key" : "Enter Google Gemini API Key"}
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="password"
                  placeholder="Paste your API key here (AIzaSy...)"
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  disabled={geminiTesting || !geminiApiKeyInput.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-40"
                >
                  {geminiTesting ? "Testing..." : "Test Key"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveGeminiKey}
                  disabled={geminiSaving || !geminiApiKeyInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all disabled:opacity-40"
                >
                  {geminiSaving ? "Saving..." : "Save Key"}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Free tier available at Google AI Studio</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 font-semibold underline"
                >
                  Get your free API key at Google AI Studio ↗
                </a>
              </div>
            </div>

            {/* Model Capabilities & Feature Breakdown */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Multimodal Vision Capabilities</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">1. Roster &amp; Student Extraction</div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Accurately identifies student IDs, Khmer / International names, and gender from handwritten or printed rosters.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">2. Handwritten Symbol Classifier</div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Distinguishes checkmarks (✓), letters (A, P, L, E), empty spaces, and smudged scribbles with individual confidence scores.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">3. Coordinate Mapping</div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Maps each recognized cell to its pixel coordinates on the original image for interactive split-screen verification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
