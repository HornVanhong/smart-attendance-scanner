"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Search,
  Filter,
  Plus,
  FileCheck,
  History,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AttendanceRecordModel, ClassModel, SubjectModel } from "@/lib/db-store";

export default function AttendanceRecordsPage() {
  const [records, setRecords] = useState<AttendanceRecordModel[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");

  // Manual entry modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    studentId: "stu_1001",
    classId: "cls_10a",
    subjectId: "sub_math101",
    attendanceDate: new Date().toISOString().split("T")[0],
    period: 1,
    status: "PRESENT" as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
    remarks: "",
  });

  // View individual student state (មើលសិស្សម្នាក់ៗ)
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleOpenStudentView = (id: string) => {
    if (!id) return;
    setViewStudentId(id);
    setLoadingDetails(true);
    fetch(`/api/students/${id}`)
      .then((res) => res.json())
      .then((d) => {
        setStudentDetails(d.student || null);
        setLoadingDetails(false);
      })
      .catch((e) => {
        console.error(e);
        setLoadingDetails(false);
      });
  };

  const fetchRecords = () => {
    setLoading(true);
    fetch("/api/attendance")
      .then((r) => r.json())
      .then((d) => {
        setRecords(d.records || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {});
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        search === "" ||
        (r.studentName && r.studentName.toLowerCase().includes(search.toLowerCase())) ||
        (r.studentNumber && r.studentNumber.toLowerCase().includes(search.toLowerCase()));

      const matchClass = selectedClass === "ALL" || r.classId === selectedClass;
      const matchSubject = selectedSubject === "ALL" || r.subjectId === selectedSubject;
      const matchStatus = selectedStatus === "ALL" || r.status === selectedStatus;
      const matchDate = selectedDate === "" || r.attendanceDate === selectedDate;

      return matchSearch && matchClass && matchSubject && matchStatus && matchDate;
    });
  }, [records, search, selectedClass, selectedSubject, selectedStatus, selectedDate]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedClass, selectedSubject, selectedStatus, selectedDate]);

  const totalFilteredCount = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    if (pageSize >= 9999) return filteredRecords;
    const start = (safePage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safePage, pageSize]);

  const renderPagination = (itemName = "records") => {
    if (totalFilteredCount === 0) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-slate-200 text-xs no-print bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-500">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
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


  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });
      if (!res.ok) throw new Error("Failed to create record");
      setShowManualModal(false);
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់លុបកំណត់ត្រាវត្តមាននេះមែនទេ? (Are you sure you want to delete this attendance record?)")) return;
    try {
      const res = await fetch(`/api/attendance?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchRecords();
    } catch (e) {
      console.error(e);
    }
  };


  const handleExportFilteredExcel = () => {
    if (filteredRecords.length === 0) {
      alert("No attendance records to export with current filters.");
      return;
    }
    const exportDate = new Date().toISOString().split("T")[0];
    const className = classes.find((c) => c.id === selectedClass)?.name || "All Classes";
    const subjectName = subjects.find((s) => s.id === selectedSubject)?.name || "All Subjects";

    const rows: any[][] = [
      ["SMART ATTENDANCE MASTER LEDGER REPORT"],
      [`ថ្នាក់ (Class): ${className}`, `មុខវិជ្ជា (Subject): ${subjectName}`, `កាលបរិច្ឆេទ: ${exportDate}`],
      [`សរុបកំណត់ត្រា: ${filteredRecords.length}`],
      [],
      ["ល.រ (No.)", "កាលបរិច្ឆេទ (Date)", "ម៉ោង (Period)", "អត្តលេខ (ID)", "ឈ្មោះសិស្ស (Student Name)", "ថ្នាក់ (Class)", "មុខវិជ្ជា (Subject)", "និមិត្តសញ្ញា (Symbol)", "ស្ថានភាព (Status)", "ការផ្ទៀងផ្ទាត់ (Verification)"]
    ];

    filteredRecords.forEach((r, idx) => {
      rows.push([
        idx + 1,
        r.attendanceDate,
        `Period ${r.period}`,
        r.studentNumber || "—",
        r.studentName || "—",
        r.className || "—",
        r.subjectName || "—",
        r.originalSymbol || "✓",
        r.status === "PRESENT" ? "✓ វត្តមាន (Present)" : r.status === "ABSENT" ? "A ឈប់អត់ច្បាប់ (Absent)" : r.status === "EXCUSED" ? "P ឈប់មានច្បាប់ (Excused)" : "L មកយឺត (Late)",
        r.isVerified ? "ផ្ទៀងផ្ទាត់រួច (Verified)" : "រង់ចាំពិនិត្យ (Pending)"
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 28 },
      { wch: 20 },
      { wch: 22 },
      { wch: 12 },
      { wch: 24 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Records");
    XLSX.writeFile(wb, `Attendance_Ledger_${exportDate}.xlsx`);
  };

  const handleExportFilteredPDF = () => {
    if (filteredRecords.length === 0) {
      alert("No attendance records to export with current filters.");
      return;
    }
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const className = classes.find((c) => c.id === selectedClass)?.name || "All Classes";
    const subjectName = subjects.find((s) => s.id === selectedSubject)?.name || "All Subjects";
    const exportDate = new Date().toISOString().split("T")[0];

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("SMART ATTENDANCE MASTER LEDGER", 14, 11);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text(`Scope: ${className} | Subject: ${subjectName} | Generated: ${exportDate}`, 14, 18);

    const tableData = filteredRecords.map((r, idx) => [
      idx + 1,
      r.attendanceDate,
      `P${r.period}`,
      r.studentNumber || "—",
      r.studentName || "—",
      r.subjectName || "—",
      r.originalSymbol || "✓",
      r.status,
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["#", "Date", "Period", "ID", "Student Name", "Subject", "Mark", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    doc.save(`Attendance_Ledger_${exportDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Attendance Master Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit-tracked attendance records verified from scanned paper sheets and manual entries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filtered Export Buttons */}
          <button
            onClick={handleExportFilteredPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-colors"
            title="Export filtered records to PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" /> Export PDF
          </button>
          <button
            onClick={handleExportFilteredExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
            title="Export filtered records to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
          </button>
          <Link
            href="/scan"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <FileCheck className="w-3.5 h-3.5 text-sky-600" /> Scan Sheet
          </Link>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Manual Entry
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Date Picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          >
            <option value="ALL">All Classes (គ្រប់ថ្នាក់)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          >
            <option value="ALL">All Subjects (គ្រប់មុខវិជ្ជា)</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Statuses (គ្រប់ស្ថានភាព)</option>
            <option value="PRESENT">✓ វត្តមាន (Present)</option>
            <option value="ABSENT">A ឈប់អត់ច្បាប់ (Absent)</option>
            <option value="EXCUSED">P ឈប់មានច្បាប់ (Permission)</option>
            <option value="LATE">L មកយឺត (Late)</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">សរុបកំណត់ត្រា</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{records.length}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">វត្តមាន (✓)</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
            {records.filter((r) => r.status === "PRESENT").length} ដង
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-red-100 bg-red-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-red-700 uppercase">ឈប់អត់ច្បាប់ (A)</span>
          <div className="text-xl font-extrabold text-red-600 mt-0.5">
            {records.filter((r) => r.status === "ABSENT").length} ដង
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-blue-100 bg-blue-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase">ឈប់មានច្បាប់ (P)</span>
          <div className="text-xl font-extrabold text-blue-600 mt-0.5">
            {records.filter((r) => r.status === "EXCUSED").length} ដង
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-amber-100 bg-amber-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase">មកយឺត (L)</span>
          <div className="text-xl font-extrabold text-amber-600 mt-0.5">
            {records.filter((r) => r.status === "LATE").length} ដង
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Date &amp; Period</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class &amp; Subject</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Symbol</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Source Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map((r) => {
                const getStatusPill = () => {
                  switch (r.status) {
                    case "PRESENT":
                      return {
                        className: "bg-emerald-50 text-emerald-700 border-emerald-300",
                        label: "✓ វត្តមាន",
                      };
                    case "ABSENT":
                      return {
                        className: "bg-red-50 text-red-700 border-red-300 font-extrabold",
                        label: "A ឈប់អត់ច្បាប់",
                      };
                    case "LATE":
                      return {
                        className: "bg-amber-50 text-amber-700 border-amber-300",
                        label: "L មកយឺត",
                      };
                    case "EXCUSED":
                      return {
                        className: "bg-blue-50 text-blue-700 border-blue-300 font-bold",
                        label: "P ឈប់មានច្បាប់",
                      };
                    default:
                      return {
                        className: "bg-slate-100 text-slate-700 border-slate-300",
                        label: r.status,
                      };
                  }
                };

                const statusInfo = getStatusPill();

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.attendanceDate}</div>
                      <div className="text-[11px] text-slate-400 font-medium">Period {r.period}</div>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleOpenStudentView(r.studentId)}
                        className="font-bold text-slate-900 hover:text-sky-600 hover:underline text-left block"
                        title="មើលវត្តមានសិស្សម្នាក់ៗ"
                      >
                        {r.studentName}
                      </button>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span>{r.studentNumber}</span>
                        <button
                          onClick={() => handleOpenStudentView(r.studentId)}
                          className="text-[10px] text-sky-600 font-bold hover:underline bg-sky-50 px-1 rounded border border-sky-200"
                        >
                          មើលសិស្ស
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{r.className}</div>
                      <div className="text-[11px] text-slate-500">{r.subjectName}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {r.originalSymbol || "—"}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Verified by {r.verifiedByName || "Prof. Chang"}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.sourceSheetId ? (
                          <Link
                            href={`/scan/${r.sourceSheetId}/review`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                            title="មើលការស្កេន / View & Manage Scan"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Scan
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-400">Manual Entry</span>
                        )}
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="លុបកំណត់ត្រានេះ (Delete Record)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No attendance records match the current filter criteria.
          </div>
        )}

        {renderPagination("records")}
      </div>

      {/* Manual Attendance Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleManualEntry}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Record Manual Attendance</h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={manualForm.attendanceDate}
                    onChange={(e) => setManualForm({ ...manualForm, attendanceDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Period *</label>
                  <select
                    value={manualForm.period}
                    onChange={(e) => setManualForm({ ...manualForm, period: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={1}>Period 1 (08:30 - 09:15)</option>
                    <option value={2}>Period 2 (09:20 - 10:05)</option>
                    <option value={3}>Period 3 (10:15 - 11:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Class *</label>
                <select
                  value={manualForm.classId}
                  onChange={(e) => setManualForm({ ...manualForm, classId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <select
                  value={manualForm.subjectId}
                  onChange={(e) => setManualForm({ ...manualForm, subjectId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attendance Status *</label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500 font-bold"
                >
                  <option value="PRESENT">✓ Present</option>
                  <option value="ABSENT">A Absent</option>
                  <option value="LATE">L Late</option>
                  <option value="EXCUSED">E Excused</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teacher Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Excused with parental note"
                  value={manualForm.remarks}
                  onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30"
              >
                Record Entry
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Individual Student Attendance Profile Modal (មើលសិស្សម្នាក់ៗ) */}
      {viewStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 font-extrabold text-lg flex items-center justify-center shadow-inner">
                  {studentDetails?.gender === "F" ? "👩‍🎓" : "👨‍🎓"}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                    {studentDetails?.fullName || "កំពុងទាញយក..."}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {studentDetails?.studentNumber}
                    </span>
                    <span>• {studentDetails?.className}</span>
                    <span>• ភេទ: {studentDetails?.gender === "F" ? "ស្រី (F)" : "ប្រុស (M)"}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewStudentId(null);
                  setStudentDetails(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500">កំពុងទាញយកព័ត៌មានវត្តមានសិស្ស...</p>
              </div>
            ) : studentDetails ? (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Attendance Tally Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">វត្តមាន (✓)</span>
                    <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                      {studentDetails.stats?.presentCount || 0} ដង
                    </div>
                  </div>
                  <div className="bg-red-50/50 p-3 rounded-2xl border border-red-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-red-700">ឈប់អត់ច្បាប់ (A)</span>
                    <div className="text-xl font-extrabold text-red-600 mt-0.5">
                      {studentDetails.stats?.absentCount || 0} ដង
                    </div>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-blue-700">ឈប់មានច្បាប់ (P)</span>
                    <div className="text-xl font-extrabold text-blue-600 mt-0.5">
                      {studentDetails.stats?.excusedCount || 0} ដង
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-600">អត្រាវត្តមាន</span>
                    <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {studentDetails.stats?.rate || 100}%
                    </div>
                    <span className="text-[9px] text-slate-400">សរុប {studentDetails.stats?.totalSessions || 0} ដង</span>
                  </div>
                </div>

                {/* Detailed Session History Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" /> កាលវិភាគវត្តមានតាមមុខវិជ្ជា (Session Ledger)
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">កាលបរិច្ឆេទ &amp; ម៉ោង</th>
                          <th className="py-2 px-3">មុខវិជ្ជា</th>
                          <th className="py-2 px-3 text-center">និមិត្តសញ្ញា</th>
                          <th className="py-2 px-3">ស្ថានភាព</th>
                          <th className="py-2 px-3 text-right">ការផ្ទៀងផ្ទាត់</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(studentDetails.records || []).map((rec: any) => {
                          const getPill = () => {
                            switch (rec.status) {
                              case "PRESENT":
                                return "bg-emerald-50 text-emerald-700 border-emerald-300";
                              case "ABSENT":
                                return "bg-red-50 text-red-700 border-red-300 font-bold";
                              case "EXCUSED":
                                return "bg-blue-50 text-blue-700 border-blue-300 font-bold";
                              case "LATE":
                                return "bg-amber-50 text-amber-700 border-amber-300";
                              default:
                                return "bg-slate-100 text-slate-700 border-slate-300";
                            }
                          };

                          const getKhmerStatus = () => {
                            switch (rec.status) {
                              case "PRESENT": return "✓ វត្តមាន";
                              case "ABSENT": return "A ឈប់អត់ច្បាប់";
                              case "EXCUSED": return "P ឈប់មានច្បាប់";
                              case "LATE": return "L មកយឺត";
                              default: return rec.status;
                            }
                          };

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-medium text-slate-900">
                                <div>{rec.date}</div>
                                <div className="text-[10px] text-slate-400">Period {rec.period}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{rec.subjectName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{rec.subjectCode}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                {rec.originalSymbol || "—"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPill()}`}>
                                  {getKhmerStatus()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-[11px] text-slate-500">
                                {rec.verifiedByName || "Prof. Chang"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {(!studentDetails.records || studentDetails.records.length === 0) && (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        មិនទាន់មានកំណត់ត្រាវត្តមានសម្រាប់សិស្សនេះនៅឡើយទេ។
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setViewStudentId(null);
                  setStudentDetails(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                បិទ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
