"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Undo2,
  Redo2,
  CheckCircle2,
  AlertTriangle,
  Save,
  Check,
  ChevronRight,
  Filter,
  Eye,
  Crosshair,
  Search,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Layers,
  Calendar,
} from "lucide-react";
import { ScanCellModel, AttendanceSheetModel } from "@/lib/db-store";

export default function ReviewWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const sheetId = (params?.id as string) || "scan_sample_01";

  // Data state
  const [sheet, setSheet] = useState<AttendanceSheetModel | null>(null);
  const [cells, setCells] = useState<ScanCellModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<ScanCellModel[][]>([]);
  const [future, setFuture] = useState<ScanCellModel[][]>([]);

  // Selection & Active cell
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedCellIds, setSelectedCellIds] = useState<Set<string>>(new Set());

  // Filter state
  const [filterMode, setFilterMode] = useState<"ALL" | "NEEDS_REVIEW" | "LOW_CONFIDENCE" | "UNVERIFIED" | "VERIFIED">("ALL");
  const [searchStudent, setSearchStudent] = useState("");

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState(1.0); // 0.5 to 3.0
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  // Image natural dimensions
  const [imgDims, setImgDims] = useState<{ width: number; height: number }>({ width: 1100, height: 850 });

  // Gemini AI Reprocess state
  const [showReprocessModal, setShowReprocessModal] = useState(false);
  const [reprocessKey, setReprocessKey] = useState("");
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState("");
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [geminiMaskedKey, setGeminiMaskedKey] = useState("");
  const [viewingStudentRow, setViewingStudentRow] = useState<any | null>(null);

  const checkAiConfig = useCallback(() => {
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((d) => {
        setGeminiConfigured(!!d.configured);
        setGeminiMaskedKey(d.maskedKey || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    checkAiConfig();
  }, [checkAiConfig]);

  useEffect(() => {
    fetch(`/api/scans/${sheetId}/results`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load scan");
        return res.json();
      })
      .then((data) => {
        setSheet(data.sheet);
        setCells(data.cells || []);
        if (data.cells?.length > 0) {
          // Select first cell or first error
          const firstError = data.cells.find(
            (c: ScanCellModel) =>
              c.confidenceScore < 0.75 || c.interpretedStatus === "NEEDS_REVIEW"
          );
          const initial = firstError || data.cells[0];
          setSelectedCellId(initial.id);
          setSelectedRowIndex(initial.rowIndex);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [sheetId]);

  // Selected cell object
  const activeCell = useMemo(
    () => cells.find((c) => c.id === selectedCellId),
    [cells, selectedCellId]
  );

  // Record a state change in history for Undo
  const pushState = useCallback((newCells: ScanCellModel[]) => {
    setHistory((prev) => [...prev.slice(-20), cells]);
    setFuture([]);
    setCells(newCells);
  }, [cells]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture((f) => [cells, ...f]);
    setHistory((h) => h.slice(0, -1));
    setCells(prev);
  }, [cells, history]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, cells]);
    setFuture((f) => f.slice(1));
    setCells(next);
  }, [cells, future]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Update status for a specific cell
  const handleUpdateStatus = (
    cellId: string,
    newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NEEDS_REVIEW"
  ) => {
    const updated = cells.map((c) => {
      if (c.id === cellId) {
        return {
          ...c,
          interpretedStatus: newStatus,
          reviewStatus: "CORRECTED" as const,
          confidenceScore: 1.0,
          isEdited: true,
        };
      }
      return c;
    });
    pushState(updated);
  };

  // Bulk update status for multiple selected cells
  const handleBulkStatus = (newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") => {
    if (selectedCellIds.size === 0) return;
    const updated = cells.map((c) => {
      if (selectedCellIds.has(c.id)) {
        return {
          ...c,
          interpretedStatus: newStatus,
          reviewStatus: "CORRECTED" as const,
          confidenceScore: 1.0,
          isEdited: true,
        };
      }
      return c;
    });
    pushState(updated);
    setSelectedCellIds(new Set());
  };

  // Select / toggle cell selection
  const handleSelectCell = (cell: ScanCellModel) => {
    setSelectedCellId(cell.id);
    setSelectedRowIndex(cell.rowIndex);

    // Zoom and center on the cell bounding box
    if (cell.cellBoundingBox) {
      const { x, y, w, h } = cell.cellBoundingBox;
      // Center calculation inside viewer using real image dimensions
      setPanX(-(x + w / 2 - imgDims.width / 2) * zoomLevel);
      setPanY(-(y + h / 2 - imgDims.height / 2) * zoomLevel);
    }
  };

  // Reprocess existing sheet with Gemini AI Multimodal Vision
  const handleReprocessWithGemini = async () => {
    setReprocessing(true);
    setReprocessError("");
    try {
      const res = await fetch(`/api/scans/${sheetId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiApiKey: reprocessKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process scan with Gemini");
      }

      // Reload results
      const resultsRes = await fetch(`/api/scans/${sheetId}/results`);
      const resultsData = await resultsRes.json();
      setSheet(resultsData.sheet);
      setCells(resultsData.cells || []);
      if (resultsData.cells?.length > 0) {
        setSelectedCellId(resultsData.cells[0].id);
        setSelectedRowIndex(resultsData.cells[0].rowIndex);
      }
      setShowReprocessModal(false);
      checkAiConfig();
    } catch (err: any) {
      setReprocessError(err.message || "Failed to reprocess image");
    } finally {
      setReprocessing(false);
    }
  };

  // Jump to next error / low-confidence cell
  const handleReviewNextError = () => {
    const currentIndex = cells.findIndex((c) => c.id === selectedCellId);
    let nextIdx = -1;

    for (let i = currentIndex + 1; i < cells.length; i++) {
      const c = cells[i];
      if (c.confidenceScore < 0.75 || c.interpretedStatus === "NEEDS_REVIEW" || c.reviewStatus === "NEEDS_REVIEW" || !c.studentId) {
        nextIdx = i;
        break;
      }
    }

    if (nextIdx === -1) {
      for (let i = 0; i <= currentIndex; i++) {
        const c = cells[i];
        if (c.confidenceScore < 0.75 || c.interpretedStatus === "NEEDS_REVIEW" || c.reviewStatus === "NEEDS_REVIEW" || !c.studentId) {
          nextIdx = i;
          break;
        }
      }
    }

    if (nextIdx !== -1) {
      handleSelectCell(cells[nextIdx]);
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await fetch(`/api/scans/${sheetId}/results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cells, isDraft: true }),
      });
      alert("Draft corrections saved successfully.");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Confirm attendance
  const handleConfirmAttendance = async () => {
    setConfirming(true);
    try {
      // First save all edits
      await fetch(`/api/scans/${sheetId}/results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cells }),
      });

      // Confirm
      const res = await fetch(`/api/scans/${sheetId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifiedById: "usr_teacher",
        }),
      });

      const confirmData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(confirmData.error || "Confirmation failed");
      }

      setShowConfirmModal(false);
      router.push("/attendance");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to confirm attendance.");
    } finally {
      setConfirming(false);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(3.0, z + 0.25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.6, z - 0.25));
  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanX(0);
    setPanY(0);
  };

  // Mouse pan drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanX(e.clientX - panStart.x);
    setPanY(e.clientY - panStart.y);
  };
  const handleMouseUp = () => setIsPanning(false);

  // Dynamic column headers detected across the attendance sheet
  const distinctColumns = useMemo(() => {
    const colMap = new Map<number, { period: number; label: string; date?: string }>();
    cells.forEach((c) => {
      const idx = typeof c.columnIndex === "number" ? c.columnIndex : (c.period - 1);
      if (!colMap.has(idx)) {
        colMap.set(idx, {
          period: c.period,
          label: `Period ${c.period}`,
          date: c.dateString,
        });
      }
    });
    const sorted = Array.from(colMap.entries()).sort((a, b) => a[0] - b[0]);
    if (sorted.length === 0) {
      return [
        { key: 0, period: 1, label: "Period 1" },
        { key: 1, period: 2, label: "Period 2" },
        { key: 2, period: 3, label: "Period 3" },
      ];
    }
    return sorted.map(([key, val]) => ({ key, ...val }));
  }, [cells]);

  // Group cells by Student Rows for spreadsheet display
  // រាប់តាមជួរដេក (Count horizontally along row): A = ឈប់អត់ច្បាប់, ✓ / P = វត្តមាន
  const rowsMap = useMemo(() => {
    const map = new Map<number, ScanCellModel[]>();
    cells.forEach((cell) => {
      const r = cell.rowIndex;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(cell);
    });
    return Array.from(map.entries())
      .map(([rowIndex, rowCells]) => {
        rowCells.sort((a, b) => (a.columnIndex ?? a.period) - (b.columnIndex ?? b.period));

        // រាប់តាមជួរដេក: ចំនួនដងឈប់អត់ច្បាប់ (A)
        const absentCount = rowCells.filter(
          (c) =>
            c.interpretedStatus === "ABSENT" ||
            c.recognizedSymbol?.toUpperCase() === "A"
        ).length;

        // រាប់តាមជួរដេក: ចំនួនដងឈប់មានច្បាប់ (P)
        const excusedCount = rowCells.filter(
          (c) =>
            c.interpretedStatus === "EXCUSED" ||
            c.recognizedSymbol?.toUpperCase() === "P" ||
            c.recognizedSymbol?.toUpperCase() === "E" ||
            c.recognizedSymbol?.toUpperCase() === "C"
        ).length;

        // រាប់តាមជួរដេក: ចំនួនដងមានវត្តមាន (✓)
        const presentCount = rowCells.filter(
          (c) =>
            c.interpretedStatus === "PRESENT" ||
            c.recognizedSymbol === "✓" ||
            c.recognizedSymbol === "/"
        ).length;

        const lateCount = rowCells.filter(
          (c) =>
            c.interpretedStatus === "LATE" ||
            c.recognizedSymbol?.toUpperCase() === "L"
        ).length;

        const totalMarked = absentCount + excusedCount + presentCount + lateCount;

        return {
          rowIndex,
          studentName: rowCells[0]?.matchedStudentName || rowCells[0]?.rawStudentName || `Student ${rowIndex + 1}`,
          studentNumber: rowCells[0]?.rawStudentNumber || `STU-${1001 + rowIndex}`,
          gender: rowCells[0]?.gender || "M",
          cells: rowCells,
          absentCount,    // ឈប់អត់ច្បាប់ (A)
          excusedCount,   // ឈប់មានច្បាប់ (P)
          presentCount,   // វត្តមាន (✓)
          lateCount,      // មកយឺត (L)
          totalMarked,
          totalCount: rowCells.length,
        };
      })
      .filter((row) => {
        if (!searchStudent) return true;
        const q = searchStudent.toLowerCase();
        return (
          row.studentName.toLowerCase().includes(q) ||
          row.studentNumber.toLowerCase().includes(q)
        );
      });
  }, [cells, searchStudent]);

  // Statistics calculation for the summary bar
  const stats = useMemo(() => {
    const totalCells = cells.length;
    const highConf = cells.filter((c) => c.confidenceScore >= 0.75).length;
    const lowConf = cells.filter((c) => c.confidenceScore < 0.75 || c.interpretedStatus === "NEEDS_REVIEW").length;
    const needsReview = cells.filter((c) => c.interpretedStatus === "NEEDS_REVIEW" || c.reviewStatus === "NEEDS_REVIEW").length;
    const emptyCount = cells.filter((c) => c.interpretedStatus === "UNMARKED").length;
    const uniqueStudents = new Set(cells.map((c) => c.rowIndex)).size;

    // សរុបឈប់អត់ច្បាប់ (Total A - Unexcused Absence)
    const totalAbsent = cells.filter(
      (c) =>
        c.interpretedStatus === "ABSENT" ||
        c.recognizedSymbol?.toUpperCase() === "A"
    ).length;

    // សរុបឈប់មានច្បាប់ (Total P - Permission / Excused)
    const totalExcused = cells.filter(
      (c) =>
        c.interpretedStatus === "EXCUSED" ||
        c.recognizedSymbol?.toUpperCase() === "P" ||
        c.recognizedSymbol?.toUpperCase() === "E" ||
        c.recognizedSymbol?.toUpperCase() === "C"
    ).length;

    // សរុបវត្តមាន (Total ✓ - Present)
    const totalPresent = cells.filter(
      (c) =>
        c.interpretedStatus === "PRESENT" ||
        c.recognizedSymbol === "✓" ||
        c.recognizedSymbol === "/"
    ).length;

    return {
      totalCells,
      highConf,
      lowConf,
      needsReview,
      emptyCount,
      uniqueStudents,
      totalAbsent,
      totalExcused,
      totalPresent,
      percentVerified: totalCells > 0 ? Math.round(((totalCells - needsReview) / totalCells) * 100) : 100,
    };
  }, [cells]);

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading attendance review workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto">
      {/* Top Review Bar: Meta info & Primary actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/history"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
            title="Back to History"
          >
            ← Back
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {sheet?.className || "Grade 10 - Section A"} • {sheet?.subjectName || "Mathematics"}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                In Review ({stats.needsReview} pending)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Uploaded by {sheet?.uploadedByName || "Prof. Chang"} • Oct 14, 2024 • Period 1–3
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Jump to Next Error Button */}
          <button
            onClick={handleReviewNextError}
            disabled={stats.needsReview === 0 && stats.lowConf === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-600" />
            Review Next Error ({stats.needsReview})
          </button>

          {/* Reprocess with Gemini AI */}
          <button
            onClick={() => {
              setReprocessError("");
              setShowReprocessModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-bold transition-all shadow-sm"
            title="Reprocess this sheet using Google Gemini Multimodal AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            ⚡ Reprocess with Gemini AI
          </button>

          {/* Save Draft */}
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Draft"}
          </button>

          {/* Confirm Attendance */}
          <button
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all"
          >
            <Check className="w-4 h-4" />
            Confirm Attendance
          </button>
        </div>
      </div>

      {/* Review Summary Metrics Bar with Khmer/English tally counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500">សិស្សសរុប (Students)</span>
          <div className="text-lg font-extrabold text-slate-900">{stats.uniqueStudents} នាក់</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-red-200 bg-red-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-red-600">ឈប់អត់ច្បាប់ (A)</span>
          <div className="text-lg font-extrabold text-red-600">{stats.totalAbsent} ដង</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-blue-600">ឈប់មានច្បាប់ (P)</span>
          <div className="text-lg font-extrabold text-blue-600">{stats.totalExcused} ដង</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600">វត្តមាន (✓)</span>
          <div className="text-lg font-extrabold text-emerald-600">{stats.totalPresent} ដង</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-600">ត្រូវពិនិត្យ (Review)</span>
          <div className="text-lg font-extrabold text-amber-600">{stats.needsReview}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-sky-600">អត្រាផ្ទៀងផ្ទាត់ (Rate)</span>
          <div className="text-lg font-extrabold text-sky-600">{stats.percentVerified}%</div>
        </div>
      </div>

      {/* SPLIT SCREEN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT PANEL: ORIGINAL IMAGE VIEWER ================= */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[750px] sticky top-20">
          {/* Viewer Controls Header */}
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold">Original Paper Sheet</span>
              <span className="text-[10px] text-slate-400">({Math.round(zoomLevel * 100)}%)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleZoomOut}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold px-2"
                title="Fit to Screen"
              >
                Fit
              </button>
              <button
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className={`p-1 rounded text-[10px] font-semibold px-2 ${
                  showBoundingBoxes ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
                title="Toggle Cell Overlays"
              >
                Grids
              </button>
            </div>
          </div>

          {/* Interactive Zoom & Pan Canvas */}
          <div
            ref={imageContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex-1 relative bg-slate-950 overflow-hidden cursor-${
              isPanning ? "grabbing" : "grab"
            } flex items-center justify-center select-none`}
          >
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.15s ease-out",
              }}
              className="relative inline-block"
            >
              {/* Document Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sheet?.imageStorageKey || "/samples/attendance_sheet_sample.svg"}
                alt="Original Attendance Sheet"
                onLoad={(e) => {
                  const target = e.currentTarget;
                  if (target.naturalWidth && target.naturalHeight) {
                    setImgDims({ width: target.naturalWidth, height: target.naturalHeight });
                  }
                }}
                style={{ width: imgDims.width, height: imgDims.height }}
                className="max-w-none pointer-events-none rounded shadow-2xl"
              />

              {/* Bounding Box Overlays */}
              {showBoundingBoxes && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${imgDims.width} ${imgDims.height}`}
                >
                  {cells.map((cell) => {
                    const isSelected = cell.id === selectedCellId;
                    const isLow = cell.confidenceScore < 0.75 || cell.interpretedStatus === "NEEDS_REVIEW";
                    const strokeColor = isSelected
                      ? "#38bdf8"
                      : isLow
                      ? "#f59e0b"
                      : "#10b981";

                    return (
                      <g key={cell.id} className="pointer-events-auto cursor-pointer" onClick={() => handleSelectCell(cell)}>
                        <rect
                          x={cell.cellBoundingBox.x}
                          y={cell.cellBoundingBox.y}
                          width={cell.cellBoundingBox.w}
                          height={cell.cellBoundingBox.h}
                          fill={isSelected ? "rgba(56, 189, 248, 0.25)" : "transparent"}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 3 : 1.5}
                          strokeDasharray={isSelected ? "none" : isLow ? "4 2" : "none"}
                          rx={3}
                        />
                        {/* Confidence Indicator Tag */}
                        {isSelected && (
                          <rect
                            x={cell.cellBoundingBox.x}
                            y={cell.cellBoundingBox.y - 18}
                            width={54}
                            height={16}
                            fill="#0284c7"
                            rx={3}
                          />
                        )}
                        {isSelected && (
                          <text
                            x={cell.cellBoundingBox.x + 27}
                            y={cell.cellBoundingBox.y - 6}
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {Math.round(cell.confidenceScore * 100)}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Selected Cell Magnifier Inset Overlay */}
            {activeCell && (
              <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl text-white max-w-xs space-y-2 z-20">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <Crosshair className="w-3.5 h-3.5" /> Cell Magnifier
                  </span>
                  <span>Period {activeCell.period}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Stylized Zoomed Crop representation */}
                  <div className="w-20 h-14 bg-white rounded border border-slate-600 flex items-center justify-center font-bold text-3xl shadow-inner text-slate-900">
                    {activeCell.recognizedSymbol || "—"}
                  </div>

                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-white truncate max-w-[150px]">
                      {activeCell.matchedStudentName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Symbol: &quot;<span className="text-sky-300 font-bold">{activeCell.recognizedSymbol}</span>&quot;
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Confidence:{" "}
                      <span
                        className={`font-bold ${
                          activeCell.confidenceScore >= 0.75 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {Math.round(activeCell.confidenceScore * 100)}%
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL: SPREADSHEET REVIEW TABLE ================= */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-[750px]">
          {/* Table Toolbar & Filters */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student name or ID..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                <button
                  onClick={() => setFilterMode("ALL")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    filterMode === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({cells.length})
                </button>
                <button
                  onClick={() => setFilterMode("NEEDS_REVIEW")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    filterMode === "NEEDS_REVIEW"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  Needs Review ({stats.needsReview})
                </button>
                <button
                  onClick={() => setFilterMode("LOW_CONFIDENCE")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    filterMode === "LOW_CONFIDENCE"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Low Conf &lt;75%
                </button>
              </div>
            </div>

            {/* Bulk Selection Actions Bar */}
            {selectedCellIds.size > 0 && (
              <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between text-xs animate-in fade-in">
                <span className="font-semibold text-sky-800">
                  {selectedCellIds.size} cell(s) selected
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleBulkStatus("PRESENT")}
                    className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-500"
                  >
                    ✓ Mark Present
                  </button>
                  <button
                    onClick={() => handleBulkStatus("ABSENT")}
                    className="px-2 py-1 rounded bg-red-600 text-white font-semibold text-[11px] hover:bg-red-500"
                  >
                    A Mark Absent
                  </button>
                  <button
                    onClick={() => handleBulkStatus("EXCUSED")}
                    className="px-2 py-1 rounded bg-blue-600 text-white font-semibold text-[11px] hover:bg-blue-500"
                  >
                    P Mark Excused (មានច្បាប់)
                  </button>
                  <button
                    onClick={() => setSelectedCellIds(new Set())}
                    className="text-slate-500 hover:text-slate-800 text-[11px] px-2"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Spreadsheet Table Scroll Container */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3 min-w-[130px]">ឈ្មោះសិស្ស &amp; អត្តលេខ</th>
                  <th className="py-2.5 px-2 text-center w-12">ភេទ</th>
                  {distinctColumns.map((col, idx) => (
                    <th key={col.key ?? idx} className="py-2.5 px-3 text-center min-w-[85px]">
                      <div>{col.label}</div>
                      {col.date && <div className="text-[9px] font-normal text-slate-400 font-mono">{col.date}</div>}
                    </th>
                  ))}
                  {/* TALLY COLUMNS: រាប់តាមជួរដេក (Count along row) */}
                  <th className="py-2.5 px-3 text-center bg-red-50 text-red-800 min-w-[110px] border-l border-red-200 font-extrabold">
                    ឈប់អត់ច្បាប់ (A)
                  </th>
                  <th className="py-2.5 px-3 text-center bg-blue-50 text-blue-800 min-w-[110px] border-l border-blue-200 font-extrabold">
                    ឈប់មានច្បាប់ (P)
                  </th>
                  <th className="py-2.5 px-3 text-center bg-emerald-50 text-emerald-800 min-w-[100px] border-l border-emerald-200 font-extrabold">
                    វត្តមាន (✓)
                  </th>
                  <th className="py-2.5 px-3 text-center min-w-[70px] border-l border-slate-200 font-bold">
                    សរុបដង
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rowsMap.map((row, idx) => {
                  const isRowActive = row.rowIndex === selectedRowIndex;

                  return (
                    <tr
                      key={row.rowIndex}
                      className={`transition-colors ${
                        isRowActive ? "bg-sky-50/60" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="py-3 px-3 font-semibold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => setViewingStudentRow(row)}
                          className="font-bold text-slate-900 hover:text-sky-600 hover:underline text-left block"
                          title="មើលសិស្សម្នាក់ៗ (View Individual Student)"
                        >
                          {row.studentName}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>{row.studentNumber}</span>
                          <button
                            onClick={() => setViewingStudentRow(row)}
                            className="text-[10px] text-sky-600 font-bold hover:underline bg-sky-50 px-1 rounded border border-sky-200"
                            title="មើលវត្តមានសិស្សម្នាក់ៗ"
                          >
                            មើលសិស្ស
                          </button>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-2 text-center font-semibold text-slate-600">
                        {row.gender}
                      </td>

                      {/* Attendance Cells along the row */}
                      {row.cells.map((cell) => {
                        const isCellSelected = cell.id === selectedCellId;
                        const isLow = cell.confidenceScore < 0.75 || cell.interpretedStatus === "NEEDS_REVIEW";

                        // Status Color Mapping
                        const getStatusBadge = () => {
                          switch (cell.interpretedStatus) {
                            case "PRESENT":
                              return "bg-emerald-50 text-emerald-700 border-emerald-300";
                            case "ABSENT":
                              return "bg-red-50 text-red-700 border-red-300 font-extrabold";
                            case "LATE":
                              return "bg-amber-50 text-amber-700 border-amber-300";
                            case "EXCUSED":
                              return "bg-blue-50 text-blue-700 border-blue-300";
                            case "NEEDS_REVIEW":
                            default:
                              return "bg-amber-100 text-amber-900 border-amber-400 animate-pulse";
                          }
                        };

                        return (
                          <td
                            key={cell.id}
                            className={`py-2 px-2 text-center transition-all ${
                              isCellSelected ? "ring-2 ring-sky-500 ring-inset bg-sky-100/40" : ""
                            }`}
                            onClick={() => handleSelectCell(cell)}
                          >
                            <div className="flex flex-col items-center gap-1">
                              {/* Status Select Dropdown with Khmer & English */}
                              <select
                                value={cell.interpretedStatus}
                                onChange={(e) =>
                                  handleUpdateStatus(cell.id, e.target.value as any)
                                }
                                className={`text-[11px] font-bold py-1 px-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-xs ${getStatusBadge()}`}
                              >
                                <option value="PRESENT">✓ វត្តមាន (Present)</option>
                                <option value="ABSENT">A ឈប់អត់ច្បាប់ (Absent)</option>
                                <option value="EXCUSED">P ឈប់មានច្បាប់ (Permission)</option>
                                <option value="LATE">L មកយឺត (Late)</option>
                                <option value="NEEDS_REVIEW">? ពិនិត្យ (Review)</option>
                              </select>

                              {/* Confidence indicator pill */}
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="font-mono text-slate-400 font-bold">
                                  &quot;{cell.recognizedSymbol}&quot;
                                </span>
                                <span
                                  className={`font-semibold ${
                                    isLow ? "text-amber-600 font-bold" : "text-slate-400"
                                  }`}
                                >
                                  {Math.round(cell.confidenceScore * 100)}%
                                </span>
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* Row Tally: ឈប់អត់ច្បាប់ (A) */}
                      <td className="py-2.5 px-3 text-center bg-red-50/40 border-l border-red-200">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full font-extrabold text-xs shadow-xs ${
                            row.absentCount > 0
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-slate-100 text-slate-500"
                          }`}
                          title={`ឈប់អត់ច្បាប់ (A): ${row.absentCount} ដង`}
                        >
                          {row.absentCount} ដង
                        </span>
                      </td>

                      {/* Row Tally: ឈប់មានច្បាប់ (P) */}
                      <td className="py-2.5 px-3 text-center bg-blue-50/40 border-l border-blue-200">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full font-extrabold text-xs shadow-xs ${
                            row.excusedCount > 0
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-slate-100 text-slate-500"
                          }`}
                          title={`ឈប់មានច្បាប់ (P): ${row.excusedCount} ដង`}
                        >
                          {row.excusedCount} ដង
                        </span>
                      </td>

                      {/* Row Tally: វត្តមាន (✓) */}
                      <td className="py-2.5 px-3 text-center bg-emerald-50/40 border-l border-emerald-200">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full font-extrabold text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                          title={`វត្តមាន (✓): ${row.presentCount} ដង`}
                        >
                          {row.presentCount} ដង
                        </span>
                      </td>

                      {/* Row Tally: Total sessions */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-l border-slate-200 text-xs">
                        {row.totalCount} ដង
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Student Row Details Modal (មើលសិស្សម្នាក់ៗ ក្នុង Review) */}
      {viewingStudentRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 font-extrabold text-base flex items-center justify-center shadow-inner">
                  {viewingStudentRow.gender === "F" ? "👩‍🎓" : "👨‍🎓"}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {viewingStudentRow.studentName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {viewingStudentRow.studentNumber}
                    </span>
                    <span>• ភេទ: {viewingStudentRow.gender === "F" ? "ស្រី (F)" : "ប្រុស (M)"}</span>
                    <span>• ជួរទី #{viewingStudentRow.rowIndex + 1}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudentRow(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Attendance Tallies for this student along the row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-700">វត្តមាន (✓)</span>
                <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                  {viewingStudentRow.presentCount} ដង
                </div>
              </div>
              <div className="bg-red-50/60 p-3 rounded-2xl border border-red-200 text-center">
                <span className="text-[10px] font-bold uppercase text-red-700">ឈប់អត់ច្បាប់ (A)</span>
                <div className="text-xl font-extrabold text-red-600 mt-0.5">
                  {viewingStudentRow.absentCount} ដង
                </div>
              </div>
              <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200 text-center">
                <span className="text-[10px] font-bold uppercase text-blue-700">ឈប់មានច្បាប់ (P)</span>
                <div className="text-xl font-extrabold text-blue-600 mt-0.5">
                  {viewingStudentRow.excusedCount} ដង
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-600">សរុបដង</span>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {viewingStudentRow.totalCount} ដង
                </div>
              </div>
            </div>

            {/* All cells list for this student */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" /> មុខវិជ្ជា និងម៉ោងទាំងអស់របស់សិស្សនេះ (Horizontal Session Grid)
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">មុខវិជ្ជា / Session</th>
                      <th className="py-2 px-3 text-center">និមិត្តសញ្ញា</th>
                      <th className="py-2 px-3 text-center">ទំនុកចិត្ត (Conf)</th>
                      <th className="py-2 px-3">ស្ថានភាពវត្តមាន</th>
                      <th className="py-2 px-3 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingStudentRow.cells.map((cell: any, cIdx: number) => {
                      const colLabel = distinctColumns[cIdx]?.label || `Period ${cell.period || cIdx + 1}`;
                      const colDate = distinctColumns[cIdx]?.date || cell.dateString;

                      return (
                        <tr key={cell.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{colLabel}</div>
                            {colDate && <div className="text-[10px] text-slate-400 font-mono">{colDate}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                            &quot;{cell.recognizedSymbol || "—"}&quot;
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium text-[11px]">
                            {Math.round(cell.confidenceScore * 100)}%
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={cell.interpretedStatus}
                              onChange={(e) => {
                                handleUpdateStatus(cell.id, e.target.value as any);
                                setViewingStudentRow((prev: any) => {
                                  if (!prev) return null;
                                  const updatedCells = prev.cells.map((c: any) =>
                                    c.id === cell.id ? { ...c, interpretedStatus: e.target.value } : c
                                  );
                                  const absentCount = updatedCells.filter((c: any) => c.interpretedStatus === "ABSENT" || c.recognizedSymbol?.toUpperCase() === "A").length;
                                  const excusedCount = updatedCells.filter((c: any) => c.interpretedStatus === "EXCUSED" || c.recognizedSymbol?.toUpperCase() === "P").length;
                                  const presentCount = updatedCells.filter((c: any) => c.interpretedStatus === "PRESENT" || c.recognizedSymbol === "✓").length;
                                  return { ...prev, cells: updatedCells, absentCount, excusedCount, presentCount };
                                });
                              }}
                              className="text-[11px] font-bold py-1 px-2 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-sky-500"
                            >
                              <option value="PRESENT">✓ វត្តមាន (Present)</option>
                              <option value="ABSENT">A ឈប់អត់ច្បាប់ (Absent)</option>
                              <option value="EXCUSED">P ឈប់មានច្បាប់ (Permission)</option>
                              <option value="LATE">L មកយឺត (Late)</option>
                              <option value="NEEDS_REVIEW">? ពិនិត្យ (Review)</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                handleSelectCell(cell);
                                setViewingStudentRow(null);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                            >
                              <Crosshair className="w-3 h-3" /> ឆ្លុះមើលក្រឡា
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingStudentRow(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                បិទ (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Finalize Attendance Records?
                </h3>
                <p className="text-xs text-slate-500">
                  This will commit verified records to the master attendance ledger.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Class:</span>
                <span className="font-semibold text-slate-800">{sheet?.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subject:</span>
                <span className="font-semibold text-slate-800">{sheet?.subjectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Cells Verified:</span>
                <span className="font-bold text-emerald-600">{stats.totalCells}</span>
              </div>
              {stats.needsReview > 0 && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Note: {stats.needsReview} cell(s) still flagged as &quot;Needs Review&quot;. They will be recorded as reviewed.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={confirming}
                onClick={handleConfirmAttendance}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 flex items-center gap-1.5"
              >
                {confirming ? "Finalizing..." : "Yes, Confirm Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reprocess with Gemini AI Modal */}
      {showReprocessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  Reprocess with Gemini AI Vision
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Multimodal
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analyze this exact attendance sheet with Google Gemini Vision to read handwritten student names, sexes, and roll-call marks.
                </p>
              </div>
            </div>

            {/* Key Status Info */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">API Connection Status:</span>
                {geminiConfigured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Key Active ({geminiMaskedKey})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> No Key Saved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {geminiConfigured
                  ? "You can run recognition immediately using the saved key, or override it by entering a new key below."
                  : "Enter your Google Gemini API key to begin. New keys will be validated and saved for future scans."}
              </p>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Gemini API Key {!geminiConfigured && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                placeholder={
                  geminiConfigured
                    ? "Leave blank to use saved key, or paste new key..."
                    : "Paste your API key (AIzaSy...)"
                }
                value={reprocessKey}
                onChange={(e) => setReprocessKey(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-slate-400">Model: Gemini 1.5 Flash (Vision)</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 font-semibold underline flex items-center gap-1"
                >
                  Get Free Key from Google AI Studio ↗
                </a>
              </div>
            </div>

            {/* Error Message */}
            {reprocessError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="break-all">{reprocessError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={reprocessing}
                onClick={() => setShowReprocessModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reprocessing || (!geminiConfigured && !reprocessKey.trim())}
                onClick={handleReprocessWithGemini}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                {reprocessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Image with Gemini Vision...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Gemini Recognition</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
