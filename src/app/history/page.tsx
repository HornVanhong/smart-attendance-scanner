"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AttendanceSheetModel } from "@/lib/db-store";

export default function ScanHistoryPage() {
  const router = useRouter();
  const [sheets, setSheets] = useState<AttendanceSheetModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AttendanceSheetModel | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const executeDelete = async (id: string, redirectToScan: boolean) => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/scans/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete scan");
      }
      setDeleteTarget(null);
      setDeleting(false);
      if (redirectToScan) {
        router.push("/scan");
      } else {
        fetchScans();
      }
    } catch (e: any) {
      alert("Error: " + (e?.message || e));
      setDeleting(false);
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalFilteredCount = filteredSheets.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedSheets = useMemo(() => {
    if (pageSize >= 9999) return filteredSheets;
    const start = (safePage - 1) * pageSize;
    return filteredSheets.slice(start, start + pageSize);
  }, [filteredSheets, safePage, pageSize]);

  const renderPagination = (itemName = "scans") => {
    if (totalFilteredCount === 0) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm text-xs no-print">
        <div className="flex items-center gap-2 text-slate-500">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={9999}>All ({totalFilteredCount})</option>
          </select>
          <span>
            per page • Showing <strong>{totalFilteredCount === 0 ? 0 : (safePage - 1) * pageSize + 1}</strong> to{" "}
            <strong>{Math.min(safePage * pageSize, totalFilteredCount)}</strong> of{" "}
            <strong>{totalFilteredCount}</strong> {itemName}
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pNum = i + 1;
                if (
                  totalPages > 7 &&
                  pNum !== 1 &&
                  pNum !== totalPages &&
                  Math.abs(pNum - safePage) > 1
                ) {
                  if (pNum === 2 || pNum === totalPages - 1) {
                    return <span key={`ell-${pNum}`} className="px-1 text-slate-400">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={`pg-${pNum}`}
                    type="button"
                    onClick={() => setCurrentPage(pNum)}
                    className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition-all ${
                      safePage === pNum
                        ? "bg-slate-900 text-white shadow-xs"
                        : "border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };


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
        {paginatedSheets.map((s) => {
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
                  onClick={() => setDeleteTarget(s)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-all"
                  title="លុបការស្កេននេះចោលដើម្បីស្កេនទិន្នន័យថ្មី (Delete scan & rescan)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden sm:inline">Delete / Rescan</span>
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

      {renderPagination("scans")}

      {/* Delete / Rescan Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  លុបការស្កេននេះ &amp; ស្កេនទិន្នន័យថ្មី?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Delete This Scan &amp; Rescan Clean Data?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-800">{deleteTarget.originalFileName}</div>
              <div className="text-slate-500">
                {deleteTarget.className || "Class"} • {deleteTarget.subjectName || "Subject"}
              </div>
              <div className="text-slate-500 font-medium pt-1">
                Detected: {deleteTarget.detectedStudentCount} Students • {deleteTarget.detectedCellCount} Cells
              </div>
            </div>

            <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <p className="font-semibold text-red-900">
                តើអ្នកចង់លុបទិន្នន័យស្កេននេះដើម្បីស្កេនយកទិន្នន័យថ្មីមែនទេ?
              </p>
              <p className="text-[11px] text-red-700 leading-relaxed">
                រាល់កំណត់ត្រាវត្តមានដែលបានបង្កើតចេញពីការស្កេននេះ នឹងត្រូវលុបសម្អាតចេញពីប្រព័ន្ធទាំងស្រុង។
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold"
              >
                បោះបង់ (Cancel)
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => executeDelete(deleteTarget.id, false)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold disabled:opacity-50"
              >
                {deleting ? "កំពុងលុប..." : "លុបតែប៉ុណ្ណោះ (Delete Only)"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => executeDelete(deleteTarget.id, true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? "កំពុងលុប..." : "លុប & ស្កេនថ្មី (Delete & Rescan)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
