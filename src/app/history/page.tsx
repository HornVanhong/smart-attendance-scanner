"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { AttendanceSheetModel } from "@/lib/db-store";

export default function ScanHistoryPage() {
  const [sheets, setSheets] = useState<AttendanceSheetModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchScans = () => {
    setLoading(true);
    fetch("/api/scans")
      .then((r) => r.json())
      .then((d) => {
        setSheets(d.sheets || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scan sheet?")) return;
    try {
      await fetch(`/api/scans/${id}`, { method: "DELETE" });
      fetchScans();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredSheets = sheets.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.originalFileName && s.originalFileName.toLowerCase().includes(q)) ||
      (s.className && s.className.toLowerCase().includes(q)) ||
      (s.subjectName && s.subjectName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Attendance Scan History &amp; Audit Trail
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log of digitized paper attendance sheets, OCR cell metrics, and verification states.
          </p>
        </div>

        <Link
          href="/scan"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-colors"
        >
          <ScanLine className="w-4 h-4" /> Scan New Sheet
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by file name, class, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredSheets.length} scans
        </div>
      </div>

      {/* Scans Cards Grid */}
      <div className="space-y-4">
        {filteredSheets.map((s) => {
          const isPendingReview = s.verificationStatus === "IN_REVIEW" || s.verificationStatus === "UNVERIFIED";

          return (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 hover:border-sky-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="flex items-center gap-4">
                {/* Thumbnail Preview */}
                <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.imageStorageKey || "/samples/attendance_sheet_sample.svg"}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-900/10" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      {s.className || "Grade 10 - Section A"} • {s.subjectName || "Mathematics"}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.verificationStatus === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {s.verificationStatus.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    File: <span className="font-mono text-slate-700">{s.originalFileName}</span> • Uploaded on {new Date(s.uploadedAt).toLocaleString()}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                    <span>
                      <strong className="text-slate-900">{s.detectedStudentCount || 10}</strong> Students
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-900">{s.detectedCellCount || 30}</strong> Cells
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold">
                      {s.highConfidenceCount || 26} High Conf
                    </span>
                    {s.lowConfidenceCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 font-bold">
                          {s.lowConfidenceCount} Needs Review
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <Link
                  href={`/scan/${s.id}/review`}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    isPendingReview
                      ? "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/25"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {isPendingReview ? "Resume Review Workspace" : "View Scan Grid"}
                </Link>

                <a
                  href={s.imageStorageKey || "/samples/attendance_sheet_sample.svg"}
                  download={s.originalFileName}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs"
                  title="Download Original Image"
                >
                  <Download className="w-4 h-4" />
                </a>

                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs"
                  title="Delete Scan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredSheets.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            No scans recorded in history.
          </div>
        )}
      </div>
    </div>
  );
}
