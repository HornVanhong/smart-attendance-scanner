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
} from "lucide-react";
import { AttendanceRecordModel, ClassModel, SubjectModel } from "@/lib/db-store";

export default function AttendanceRecordsPage() {
  const [records, setRecords] = useState<AttendanceRecordModel[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("ALL");
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
      const matchStatus = selectedStatus === "ALL" || r.status === selectedStatus;
      const matchDate = selectedDate === "" || r.attendanceDate === selectedDate;

      return matchSearch && matchClass && matchStatus && matchDate;
    });
  }, [records, search, selectedClass, selectedStatus, selectedDate]);

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

        <div className="flex items-center gap-2.5">
          <Link
            href="/scan"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <FileCheck className="w-4 h-4 text-sky-600" /> Scan Attendance Sheet
          </Link>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-colors"
          >
            <Plus className="w-4 h-4" /> Manual Record Entry
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
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="EXCUSED">Excused</option>
          </select>
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
              {filteredRecords.map((r) => {
                const getStatusPill = () => {
                  switch (r.status) {
                    case "PRESENT":
                      return "bg-emerald-50 text-emerald-700 border-emerald-300";
                    case "ABSENT":
                      return "bg-red-50 text-red-700 border-red-300";
                    case "LATE":
                      return "bg-amber-50 text-amber-700 border-amber-300";
                    case "EXCUSED":
                      return "bg-blue-50 text-blue-700 border-blue-300";
                    default:
                      return "bg-slate-100 text-slate-700 border-slate-300";
                  }
                };

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.attendanceDate}</div>
                      <div className="text-[11px] text-slate-400 font-medium">Period {r.period}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.studentName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.studentNumber}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{r.className}</div>
                      <div className="text-[11px] text-slate-500">{r.subjectName}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusPill()}`}>
                        {r.status}
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
                      {r.sourceSheetId ? (
                        <Link
                          href={`/scan/${r.sourceSheetId}/review`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Scan
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400">Manual Entry</span>
                      )}
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
    </div>
  );
}
