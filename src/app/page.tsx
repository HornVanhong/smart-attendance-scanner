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
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/attendance")
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const trendsData = data?.trends || [
    { day: "Mon", present: 94, absent: 4, late: 2 },
    { day: "Tue", present: 91, absent: 6, late: 3 },
    { day: "Wed", present: 95, absent: 3, late: 2 },
    { day: "Thu", present: 89, absent: 8, late: 3 },
    { day: "Fri", present: 93, absent: 5, late: 2 },
  ];

  const classData = data?.classBreakdown || [
    { name: "Grade 10 - Section A", attendanceRate: 94 },
    { name: "Grade 10 - Section B", attendanceRate: 92 },
    { name: "Grade 11 - STEM", attendanceRate: 96 },
  ];

  const summary = data?.summary || {
    totalStudents: 48,
    totalClasses: 3,
    scansCount: 4,
    overallRate: 94,
    presentCount: 42,
    absentCount: 4,
    lateCount: 2,
    scansRequiringReview: 1,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-navy-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
            <Sparkles className="w-3 h-3" /> AI Digitization Active
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, Prof. Chang
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            You have <span className="text-amber-400 font-semibold">{summary.scansRequiringReview} scanned attendance sheet</span> requiring teacher verification.
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
              Total Students
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {summary.totalStudents}
            </div>
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              Across {summary.totalClasses} Active Classes
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today&apos;s Attendance
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {summary.overallRate}%
            </div>
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3 h-3" /> +1.8% vs last week
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
              {summary.lateCount} Late • 1 Excused
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
            <Link
              href="/scan/scan_sample_01/review"
              className="text-[11px] text-sky-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Verify Now <ArrowRight className="w-3 h-3" />
            </Link>
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
                Weekly attendance percentage across all grades
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Present Rate
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
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
                <YAxis domain={[80, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} />
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
          </div>
        </div>

        {/* Class Comparison Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Class Comparison
              </h3>
              <p className="text-xs text-slate-500">Rate by classroom</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[85, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
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
              <p className="text-xs text-slate-500">Latest digitized paper attendance sheets</p>
            </div>
            <Link
              href="/history"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Scan Item 1 (Needs Review) */}
            <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <ScanLine className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">
                    Grade 10 - Section A • Mathematics
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Oct 14, 2024 • 10 Students • 30 Cells
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Needs Review (4)
                </span>
                <Link
                  href="/scan/scan_sample_01/review"
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  Open Review
                </Link>
              </div>
            </div>

            {/* Scan Item 2 (Verified) */}
            <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">
                    Grade 11 - STEM • Physics
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Oct 11, 2024 • 18 Students • Verified by Dr. Jenkins
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Verified
                </span>
                <Link
                  href="/attendance"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  View Records
                </Link>
              </div>
            </div>
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
            <div className="p-3 rounded-xl bg-red-50/60 border border-red-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Charles Vance</p>
                <p className="text-[11px] text-slate-500">STU-1003 • Grade 10-A</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-red-600">66%</span>
                <p className="text-[10px] text-slate-400">4 Absences</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Ian Malcolm</p>
                <p className="text-[11px] text-slate-500">STU-1009 • Grade 10-A</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-amber-600">75%</span>
                <p className="text-[10px] text-slate-400">3 Absences</p>
              </div>
            </div>
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
