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

  // Load Sheet data
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
      // Center calculation inside viewer
      setPanX(-(x + w / 2 - 550) * zoomLevel);
      setPanY(-(y + h / 2 - 425) * zoomLevel);
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
          verifiedById: "usr_teacher_chang",
        }),
      });

      if (!res.ok) throw new Error("Confirmation failed");

      setShowConfirmModal(false);
      router.push("/attendance");
    } catch (err) {
      console.error(err);
      alert("Failed to confirm attendance.");
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

  // Group cells by Student Rows for spreadsheet display
  const rowsMap = useMemo(() => {
    const map = new Map<number, ScanCellModel[]>();
    cells.forEach((cell) => {
      const r = cell.rowIndex;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(cell);
    });
    return Array.from(map.entries())
      .map(([rowIndex, rowCells]) => {
        rowCells.sort((a, b) => a.period - b.period);
        return {
          rowIndex,
          studentName: rowCells[0]?.matchedStudentName || rowCells[0]?.rawStudentName || `Student ${rowIndex + 1}`,
          studentNumber: rowCells[0]?.rawStudentNumber || `STU-${1001 + rowIndex}`,
          gender: rowCells[0]?.gender || "M",
          cells: rowCells,
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
    return {
      totalCells,
      highConf,
      lowConf,
      needsReview,
      emptyCount,
      uniqueStudents,
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

      {/* Review Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500">Students Found</span>
          <div className="text-lg font-extrabold text-slate-900">{stats.uniqueStudents}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500">Total Cells</span>
          <div className="text-lg font-extrabold text-slate-900">{stats.totalCells}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600">High Confidence</span>
          <div className="text-lg font-extrabold text-emerald-600">{stats.highConf}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-600">Needs Review</span>
          <div className="text-lg font-extrabold text-amber-600">{stats.needsReview}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500">Unmarked Cells</span>
          <div className="text-lg font-extrabold text-slate-700">{stats.emptyCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-sky-600">Verification Rate</span>
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
                className="max-w-none w-[1100px] h-[850px] pointer-events-none rounded shadow-2xl"
              />

              {/* Bounding Box Overlays */}
              {showBoundingBoxes && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 1100 850"
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
                    Mark Present
                  </button>
                  <button
                    onClick={() => handleBulkStatus("ABSENT")}
                    className="px-2 py-1 rounded bg-red-600 text-white font-semibold text-[11px] hover:bg-red-500"
                  >
                    Mark Absent
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
                  <th className="py-2.5 px-3">Student Name &amp; ID</th>
                  <th className="py-2.5 px-2 text-center w-12">Sex</th>
                  <th className="py-2.5 px-3 text-center">Period 1</th>
                  <th className="py-2.5 px-3 text-center">Period 2</th>
                  <th className="py-2.5 px-3 text-center">Period 3</th>
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
                        <div className="font-bold text-slate-900">{row.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {row.studentNumber}
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-2 text-center font-semibold text-slate-600">
                        {row.gender}
                      </td>

                      {/* Periods 1, 2, 3 Attendance Cells */}
                      {row.cells.map((cell) => {
                        const isCellSelected = cell.id === selectedCellId;
                        const isChecked = selectedCellIds.has(cell.id);
                        const isLow = cell.confidenceScore < 0.75 || cell.interpretedStatus === "NEEDS_REVIEW";

                        // Status Color Mapping
                        const getStatusBadge = () => {
                          switch (cell.interpretedStatus) {
                            case "PRESENT":
                              return "bg-emerald-50 text-emerald-700 border-emerald-300";
                            case "ABSENT":
                              return "bg-red-50 text-red-700 border-red-300";
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
                              {/* Status Select Dropdown */}
                              <select
                                value={cell.interpretedStatus}
                                onChange={(e) =>
                                  handleUpdateStatus(cell.id, e.target.value as any)
                                }
                                className={`text-[11px] font-bold py-1 px-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-xs ${getStatusBadge()}`}
                              >
                                <option value="PRESENT">✓ Present</option>
                                <option value="ABSENT">A Absent</option>
                                <option value="LATE">L Late</option>
                                <option value="EXCUSED">E Excused</option>
                                <option value="NEEDS_REVIEW">? Review</option>
                              </select>

                              {/* Confidence indicator pill */}
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="font-mono text-slate-400">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
    </div>
  );
}
