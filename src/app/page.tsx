"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  School,
  ScanLine,
  TrendingUp,
  UserCheck,
  UserX,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports/attendance").then((res) => res.json()),
      fetch("/api/scans").then((res) => res.json()),
    ])
      .then(([repData, scansData]) => {
        setData(repData);
        setRecentScans(scansData.sheets?.slice(0, 5) || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const trendsData = data?.trends || [];
  const classData = data?.classBreakdown || [];
  const lowAttendanceAlerts = data?.lowAttendanceAlerts || [];

  const summary = data?.summary || {
    totalStudents: 0,
    totalClasses: 0,
    scansCount: 0,
    overallRate: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    scansRequiringReview: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-navy-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
            <Sparkles className="w-3 h-3" /> Live Database Connected
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Classroom Attendance Dashboard
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            {summary.scansRequiringReview > 0 ? (
              <>
                You have <span className="text-amber-400 font-semibold">{summary.scansRequiringReview} scanned attendance sheet(s)</span> requiring teacher verification.
              </>
            ) : (
              "All scanned classroom rosters are up to date."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/scan"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all"
          >
            <ScanLine className="w-4 h-4" />
            Scan New Sheet
          </Link>
          <Link
            href="/students"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all"
          >
            <PlusCircle className="w-4 h-4 text-slate-400" />
            Add Student
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            Reports
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {summary.totalStudents}
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              Across {summary.totalClasses} Classes
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Overall Attendance Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Attendance Rate
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {summary.overallRate}%
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              From {summary.totalRecords} Verified Records
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Present vs Absent */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Present / Absent
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              <span className="text-emerald-600">{summary.presentCount}</span>
              <span className="text-slate-300 font-light mx-1">/</span>
              <span className="text-red-500">{summary.absentCount}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {summary.lateCount} Late Sessions
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Scans Requiring Review */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Scans To Review
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              {summary.scansRequiringReview}
            </div>
            {summary.scansRequiringReview > 0 ? (
              <Link
                href="/history"
                className="text-[11px] text-sky-600 font-semibold hover:underline inline-flex items-center gap-1"
              >
                Review In History <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <span className="text-[11px] text-slate-400">All Scans Verified</span>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Daily Attendance Trend (%)
              </h3>
              <p className="text-xs text-slate-500">
                Weekly attendance percentage across enrolled classes
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Present Rate
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {trendsData.some((t: any) => t.present > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData}>
                  <defs>
                    <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present %"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#rateGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                <TrendingUp className="w-8 h-8 stroke-1 text-slate-300" />
                <p className="text-xs font-semibold">No attendance trends recorded yet</p>
                <p className="text-[11px] text-slate-400">Scan attendance sheets to populate live trend graphs.</p>
              </div>
            )}
          </div>
        </div>

        {/* Class Comparison Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Class Comparison
              </h3>
              <p className="text-xs text-slate-500">Attendance rate by classroom</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {classData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="attendanceRate" name="Rate %" fill="#0284c7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1 text-center p-4">
                <School className="w-8 h-8 stroke-1 text-slate-300" />
                <p className="text-xs font-semibold">No classes added yet</p>
                <Link href="/classes" className="text-[11px] text-sky-600 font-bold hover:underline">
                  Create classes in Classes &amp; Subjects →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Scans Table & Attention Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Scans List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Recent Attendance Scans</h3>
              <p className="text-xs text-slate-500">Real paper sheets scanned into the system</p>
            </div>
            <Link
              href="/history"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentScans.length > 0 ? (
              recentScans.map((s) => (
                <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                      <ScanLine className="w-5 h-5 text-sky-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">
                        {s.className} • {s.subjectName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {s.originalFileName} • {s.detectedStudentCount || 0} Students
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        s.verificationStatus === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {s.verificationStatus.replace("_", " ")}
                    </span>
                    <Link
                      href={`/scan/${s.id}/review`}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      Open Review
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <ScanLine className="w-8 h-8 stroke-1 text-slate-300 mx-auto" />
                <p className="font-semibold">No attendance sheets scanned yet</p>
                <Link
                  href="/scan"
                  className="inline-flex items-center gap-1 text-sky-600 font-bold hover:underline"
                >
                  Scan your first paper attendance sheet →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Low Attendance Student Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Attendance Watchlist</h3>
              <p className="text-xs text-slate-500">Students below 80% threshold</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>

          <div className="space-y-3">
            {lowAttendanceAlerts.length > 0 ? (
              lowAttendanceAlerts.map((st: any) => (
                <div key={st.studentId} className="p-3 rounded-xl bg-red-50/60 border border-red-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{st.studentName}</p>
                    <p className="text-[11px] text-slate-500">{st.studentNumber} • {st.className}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-red-600">{st.rate}%</span>
                    <p className="text-[10px] text-slate-400">{st.absentCount} Absences</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="font-semibold text-slate-700">No attendance alerts</p>
                <p className="text-[11px] text-slate-400">All students maintain satisfactory attendance.</p>
              </div>
            )}
          </div>

          <Link
            href="/reports"
            className="w-full text-center block text-xs font-semibold text-sky-600 hover:underline pt-2"
          >
            Generate Detailed Attendance Audit →
          </Link>
        </div>
      </div>
    </div>
  );
}
