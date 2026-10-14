"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("WEEKLY");

  useEffect(() => {
    fetch("/api/reports/attendance")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const summary = data?.summary || {
    totalRecords: 35,
    overallRate: 94,
    presentCount: 30,
    absentCount: 3,
    lateCount: 2,
    excusedCount: 1,
  };

  const pieData = [
    { name: "Present", value: summary.presentCount || 30, color: "#10b981" },
    { name: "Absent", value: summary.absentCount || 3, color: "#ef4444" },
    { name: "Late", value: summary.lateCount || 2, color: "#f59e0b" },
    { name: "Excused", value: summary.excusedCount || 1, color: "#3b82f6" },
  ];

  const classData = data?.classBreakdown || [];
  const lowAttendanceStudents = data?.lowAttendanceAlerts || [];

  const handleExportExcel = () => {
    if (!data) return;

    // Build worksheet from student stats
    const wsData = (data.studentStats || []).map((s: any) => ({
      "Student ID": s.studentNumber,
      "Full Name": s.studentName,
      Class: s.className,
      "Total Sessions": s.totalSessions,
      "Present Count": s.presentCount,
      "Absent Count": s.absentCount,
      "Attendance Rate (%)": `${s.rate}%`,
      Status: s.isAlert ? "ATTENDANCE WARNING" : "Satisfactory",
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Audit");
    XLSX.writeFile(wb, `Oakridge_Attendance_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ["StudentID,FullName,Class,Sessions,Present,Absent,Rate,Status"];
    const rows = (data.studentStats || []).map(
      (s: any) =>
        `${s.studentNumber},"${s.studentName}","${s.className}",${s.totalSessions},${s.presentCount},${s.absentCount},${s.rate}%,${s.isAlert ? "ALERT" : "NORMAL"}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Oakridge_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold">OAKRIDGE ACADEMY</h1>
        <p className="text-sm">Official Classroom Attendance Audit &amp; Performance Report</p>
        <p className="text-xs text-gray-500 mt-1">
          Generated on: {new Date().toLocaleDateString()} • Reporting Period: Academic Year 2024–2025
        </p>
      </div>

      {/* Screen Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Attendance Reports &amp; Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Export official reports, verify attendance percentages, and audit student absence trends.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel (.xlsx)
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/20 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Overall Attendance</span>
            <div className="text-2xl font-extrabold text-emerald-600">{summary.overallRate}%</div>
            <span className="text-[11px] text-slate-400">Target: 90%+</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Present Sessions</span>
            <div className="text-2xl font-extrabold text-slate-900">{summary.presentCount}</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Verified Marks</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Absences</span>
            <div className="text-2xl font-extrabold text-red-600">{summary.absentCount}</div>
            <span className="text-[11px] text-slate-400">Unexcused</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Late &amp; Excused</span>
            <div className="text-2xl font-extrabold text-amber-600">
              {summary.lateCount + summary.excusedCount}
            </div>
            <span className="text-[11px] text-slate-400">Authorized/Tardy</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attendance Breakdown Pie Chart */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Status Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Class Attendance Comparison */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Attendance Rate by Class</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[80, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="attendanceRate" name="Rate %" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Attendance Watchlist Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-sm text-slate-900">
              Low Attendance Action Roster (&lt;80%)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Requires Parental Notification</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Sessions</th>
                <th className="py-2.5 px-3">Absences</th>
                <th className="py-2.5 px-3">Rate</th>
                <th className="py-2.5 px-3 text-right">Intervention Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowAttendanceStudents.map((st: any) => (
                <tr key={st.studentId} className="hover:bg-red-50/30">
                  <td className="py-3 px-3 font-bold text-slate-900">{st.studentName}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{st.studentNumber}</td>
                  <td className="py-3 px-3 text-slate-600">{st.className}</td>
                  <td className="py-3 px-3">{st.totalSessions}</td>
                  <td className="py-3 px-3 font-bold text-red-600">{st.absentCount}</td>
                  <td className="py-3 px-3 font-extrabold text-red-600">{st.rate}%</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                      Counselor Contact Required
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Signature Lines for Printed Reports */}
      <div className="hidden print:grid grid-cols-2 gap-12 pt-16 border-t mt-12 text-xs">
        <div>
          <div className="border-b border-gray-400 w-64 mb-2 pb-6">Prof. Michael Chang</div>
          <p className="font-bold">Reporting Faculty Signature</p>
          <p className="text-gray-500">Department of Mathematics</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="border-b border-gray-400 w-64 mb-2 pb-6">Dr. Sarah Jenkins</div>
          <p className="font-bold">Principal / Academic Dean</p>
          <p className="text-gray-500">Oakridge Academy</p>
        </div>
      </div>
    </div>
  );
}
