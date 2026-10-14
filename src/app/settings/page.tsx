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
} from "lucide-react";
import { SymbolConfigModel } from "@/lib/db-store";

export default function SettingsPage() {
  const [tab, setTab] = useState<"SYMBOLS" | "SCHOOL" | "AUDIT">("SYMBOLS");
  const [symbols, setSymbols] = useState<SymbolConfigModel[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // School profile state
  const [schoolForm, setSchoolForm] = useState({
    name: "Oakridge Academy",
    code: "OAK-2024",
    address: "742 Evergreen Terrace, Springfield",
    phone: "+1 (555) 234-5678",
    email: "admin@oakridge.edu",
  });

  // New symbol state
  const [newSymbol, setNewSymbol] = useState({
    symbol: "",
    mappedStatus: "PRESENT" as const,
    description: "",
  });

  const fetchData = () => {
    setLoading(true);
    fetch("/api/settings/symbols")
      .then((r) => r.json())
      .then((d) => {
        setSymbols(d.symbols || []);
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
    const added: SymbolConfigModel = {
      id: `sym_${Date.now()}`,
      schoolId: "sch_oakridge_academy",
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Settings &amp; Symbol Rules
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure handwritten symbol interpretations, school profiles, and audit controls.
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
                Schools have unique roll-call shorthand. The AI OCR pipeline classifies the original handwriting mark into raw symbols (e.g. ✓, A, P, L, E) and applies your school&apos;s custom mapping below. Original handwritten symbols are always preserved separately for complete audit fidelity.
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
              onClick={() => alert("School profile saved.")}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30"
            >
              Save Profile
            </button>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {tab === "AUDIT" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">System Security &amp; Activity Audit Log</h3>
            <span className="text-[11px] text-slate-400">Immutable Ledger</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">ATTENDANCE_VERIFIED</p>
                <p className="text-slate-500 text-[11px]">
                  User: Prof. Michael Chang • Entity: Scan scan_sample_01 • 30 cells committed to master records
                </p>
              </div>
              <span className="text-slate-400 text-[11px] shrink-0 font-mono">Just now</span>
            </div>

            <div className="py-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">OCR_PROCESSING_COMPLETED</p>
                <p className="text-slate-500 text-[11px]">
                  User: Prof. Michael Chang • 10 students identified, 26 high confidence, 4 flagged for review
                </p>
              </div>
              <span className="text-slate-400 text-[11px] shrink-0 font-mono">10m ago</span>
            </div>

            <div className="py-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">SCAN_UPLOAD</p>
                <p className="text-slate-500 text-[11px]">
                  File: Grade10_Math_Attendance_Oct14.jpg (1.42 MB) • Target: Grade 10-A Math
                </p>
              </div>
              <span className="text-slate-400 text-[11px] shrink-0 font-mono">15m ago</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
