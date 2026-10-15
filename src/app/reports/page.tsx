"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  CheckCircle2,
  Filter,
  Eye,
  Search,
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [searchStudent, setSearchStudent] = useState("");
  const [viewMode, setViewMode] = useState<"MATRIX" | "OVERVIEW">("MATRIX");
  const [loading, setLoading] = useState(true);

  // Individual student modal
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch classes and subjects for filter options
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});

    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {});

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSchool(d.school || null))
      .catch(() => {});
  }, []);

  // Fetch report data according to class and subject filters
  const fetchReportData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedClass !== "ALL") params.append("classId", selectedClass);
    if (selectedSubject !== "ALL") params.append("subjectId", selectedSubject);

    fetch(`/api/reports/attendance?${params.toString()}`)
      .then((r) => r.json())
      .then((repData) => {
        setData(repData);
        if (repData.allSubjects && repData.allSubjects.length > 0) {
          setSubjects(repData.allSubjects);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [selectedClass, selectedSubject]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const summary = data?.summary || {
    totalRecords: 0,
    overallRate: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    totalStudents: 0,
  };

  const pieData = [
    { name: "✓ វត្តមាន (Present)", value: summary.presentCount || 0, color: "#10b981" },
    { name: "A ឈប់អត់ច្បាប់ (Absent)", value: summary.absentCount || 0, color: "#ef4444" },
    { name: "P ឈប់មានច្បាប់ (Excused)", value: summary.excusedCount || 0, color: "#3b82f6" },
    { name: "L មកយឺត (Late)", value: summary.lateCount || 0, color: "#f59e0b" },
  ];

  const classData = data?.classBreakdown || [];
  const lowAttendanceStudents = data?.lowAttendanceAlerts || [];
  const studentStats = data?.studentStats || [];
  const hasRecords = summary.totalRecords > 0;

  const filteredStudentStats = studentStats.filter((s: any) => {
    if (!searchStudent.trim()) return true;
    const query = searchStudent.toLowerCase();
    return (
      s.studentName?.toLowerCase().includes(query) ||
      s.studentNumber?.toLowerCase().includes(query) ||
      s.className?.toLowerCase().includes(query)
    );
  });

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

  const displaySubjects = useMemo(() => {
    const list = subjects.length > 0 ? subjects : (data?.allSubjects || []);
    if (selectedSubject !== "ALL") {
      const match = list.filter((s: any) => s.id === selectedSubject);
      if (match.length > 0) return match;
    }
    return list;
  }, [subjects, data?.allSubjects, selectedSubject]);

  // ==========================================
  // STUDENT_ATTENDANT_FORM MATRIX EXCEL EXPORT
  // ==========================================
  const handleExportMatrixExcel = () => {
    if (!data || (data.studentStats || []).length === 0) {
      alert("No attendance records available to export.");
      return;
    }

    const selectedClassName = classes.find((c: any) => c.id === selectedClass)?.name || "Group A1 (All Classes)";
    const exportDate = new Date().toISOString().split("T")[0];
    const targetSubjects = displaySubjects.length > 0 ? displaySubjects : (data.allSubjects || []);

    const row1 = ["STUDENT_ATTENDANT_FORM"];
    const row2 = [
      `Academic Year: 2025-2026`,
      `Department: Computer Studies`,
      `Major: Computer Science`,
      `Year: 1`,
      `Group / Class: ${selectedClassName}`,
      `Export Date: ${exportDate}`,
    ];
    const row3: string[] = [];

    // Header Level 1
    const row4: string[] = ["No.", "Name of Student", "ID", "Sex"];
    // Header Level 2
    const row5: string[] = ["", "", "", ""];

    targetSubjects.forEach((sub: any) => {
      row4.push(sub.name || "Subject", "");
      row5.push("Absent", "Permission");
    });

    row4.push("Total Absent", "Total Permission");
    row5.push("", "");

    const rows: any[][] = [row1, row2, row3, row4, row5];

    let totalAllAbsent = 0;
    let totalAllPermission = 0;
    const subjectTotals: Record<string, { absent: number; permission: number }> = {};
    targetSubjects.forEach((sub: any) => {
      subjectTotals[sub.id] = { absent: 0, permission: 0 };
    });

    filteredStudentStats.forEach((s: any, idx: number) => {
      const studentRow: any[] = [
        idx + 1,
        s.studentName,
        s.studentNumber,
        s.gender || "M",
      ];

      let studentTotalAbsent = 0;
      let studentTotalPermission = 0;

      targetSubjects.forEach((sub: any) => {
        const matrix = s.subjectMatrix?.[sub.id] || { absent: 0, permission: 0 };
        const ab = matrix.absent || 0;
        const pe = matrix.permission || 0;
        studentRow.push(ab);
        studentRow.push(pe);
        studentTotalAbsent += ab;
        studentTotalPermission += pe;
        if (subjectTotals[sub.id]) {
          subjectTotals[sub.id].absent += ab;
          subjectTotals[sub.id].permission += pe;
        }
      });

      studentRow.push(studentTotalAbsent);
      studentRow.push(studentTotalPermission);
      totalAllAbsent += studentTotalAbsent;
      totalAllPermission += studentTotalPermission;

      rows.push(studentRow);
    });

    // Summary Total Row
    const summaryRow: any[] = ["TOTAL", "", "", ""];
    targetSubjects.forEach((sub: any) => {
      summaryRow.push(subjectTotals[sub.id]?.absent || 0);
      summaryRow.push(subjectTotals[sub.id]?.permission || 0);
    });
    summaryRow.push(totalAllAbsent);
    summaryRow.push(totalAllPermission);
    rows.push(summaryRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Setup Merges
    const totalCols = 4 + targetSubjects.length * 2 + 2;
    const merges: any[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
      { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
      { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } },
    ];

    let colPointer = 4;
    targetSubjects.forEach(() => {
      merges.push({ s: { r: 3, c: colPointer }, e: { r: 3, c: colPointer + 1 } });
      colPointer += 2;
    });

    merges.push({ s: { r: 3, c: colPointer }, e: { r: 4, c: colPointer } });
    merges.push({ s: { r: 3, c: colPointer + 1 }, e: { r: 4, c: colPointer + 1 } });
    merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 3 } });

    ws["!merges"] = merges;

    // Set Column Widths
    const cols: any[] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 16 },
      { wch: 8 },
    ];
    targetSubjects.forEach(() => {
      cols.push({ wch: 12 }, { wch: 14 });
    });
    cols.push({ wch: 14 }, { wch: 16 });
    ws["!cols"] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "STUDENT_ATTENDANT_FORM");
    XLSX.writeFile(wb, `STUDENT_ATTENDANT_FORM_${exportDate}.xlsx`);
  };

  // ==========================================
  // STUDENT_ATTENDANT_FORM MATRIX PDF EXPORT
  // ==========================================
  const handleExportMatrixPDF = () => {
    if (!data || (data.studentStats || []).length === 0) {
      alert("No attendance records available to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const selectedClassName = classes.find((c: any) => c.id === selectedClass)?.name || "All Classes (Group A1)";
    const exportDateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const targetSubjects = displaySubjects.length > 0 ? displaySubjects : (data.allSubjects || []);

    // Header Title Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("STUDENT ATTENDANCE FORM", 14, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`Academic Year: 2025-2026   |   Department: Computer Studies   |   Class / Group: ${selectedClassName}   |   Date: ${exportDateStr}`, 14, 18);

    // Multi-tier head rows
    const headRow1: any[] = [
      { content: "No.", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "Name of Student", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
      { content: "ID", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      { content: "Sex", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
    ];
    const headRow2: any[] = [];

    targetSubjects.forEach((sub: any) => {
      headRow1.push({
        content: sub.name,
        colSpan: 2,
        styles: { halign: "center", fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      });
      headRow2.push(
        { content: "Absent", styles: { halign: "center", textColor: [239, 68, 68] } },
        { content: "Permission", styles: { halign: "center", textColor: [59, 130, 246] } }
      );
    });

    headRow1.push(
      { content: "Total Absent", rowSpan: 2, styles: { halign: "center", valign: "middle", textColor: [239, 68, 68] } },
      { content: "Total Permission", rowSpan: 2, styles: { halign: "center", valign: "middle", textColor: [59, 130, 246] } }
    );

    const bodyRows = filteredStudentStats.map((s: any, idx: number) => {
      const row: any[] = [
        idx + 1,
        s.studentName,
        s.studentNumber,
        s.gender || "M",
      ];
      let tA = 0;
      let tP = 0;
      targetSubjects.forEach((sub: any) => {
        const matrix = s.subjectMatrix?.[sub.id] || { absent: 0, permission: 0 };
        const ab = matrix.absent || 0;
        const pe = matrix.permission || 0;
        row.push(ab);
        row.push(pe);
        tA += ab;
        tP += pe;
      });
      row.push(tA);
      row.push(tP);
      return row;
    });

    autoTable(doc, {
      startY: 28,
      head: [headRow1, headRow2],
      body: bodyRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 10, right: 10 },
    });

    doc.save(`STUDENT_ATTENDANCE_FORM_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ==========================================
  // 1. BEAUTIFUL PROFESSIONAL PDF EXPORT (LEDGER)
  // ==========================================
  const handleDownloadPDF = () => {
    if (!data || !hasRecords) {
      alert("No attendance records available to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const schoolName = school?.name || "Smart Attendance Academy";
    const selectedClassName = classes.find((c: any) => c.id === selectedClass)?.name || "All Classes";
    const selectedSubjectName = subjects.find((s: any) => s.id === selectedSubject)?.name || "All Subjects";
    const exportDateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // 1. Top Decorative Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(schoolName.toUpperCase(), 14, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text("OFFICIAL ATTENDANCE AUDIT & PERFORMANCE REPORT", 14, 18);
    doc.text(`Generated: ${exportDateStr}  |  AI Multimodal Verified Ledger`, 14, 23);

    // 2. Metadata Context Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 34, 182, 14, "FD");

    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Class: ${selectedClassName}`, 18, 43);
    doc.text(`Subject: ${selectedSubjectName}`, 82, 43);
    doc.text(`Total Records: ${summary.totalRecords}`, 148, 43);

    // 3. KPI Metrics Summary Cards Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 52, 182, 18, 2, 2, "FD");

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("PRESENT (✓)", 18, 58);
    doc.text("UNEXCUSED (A)", 54, 58);
    doc.text("EXCUSED (P)", 90, 58);
    doc.text("LATE (L)", 126, 58);
    doc.text("ATTENDANCE RATE", 158, 58);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // green
    doc.text(`${summary.presentCount} times`, 18, 66);
    doc.setTextColor(239, 68, 68); // red
    doc.text(`${summary.absentCount} times`, 54, 66);
    doc.setTextColor(59, 130, 246); // blue
    doc.text(`${summary.excusedCount} times`, 90, 66);
    doc.setTextColor(245, 158, 11); // amber
    doc.text(`${summary.lateCount} times`, 126, 66);
    doc.setTextColor(15, 23, 42); // dark
    doc.text(`${summary.overallRate}%`, 158, 66);

    // 4. Data Table
    const tableData = (data.studentStats || []).map((s: any, idx: number) => [
      idx + 1,
      s.studentNumber,
      s.studentName,
      s.gender || "M",
      s.className,
      s.totalSessions,
      s.presentCount,
      s.absentCount,
      s.excusedCount || 0,
      `${s.rate}%`,
      s.isAlert ? "WARNING" : "NORMAL",
    ]);

    autoTable(doc, {
      startY: 75,
      head: [
        [
          "#",
          "Student ID",
          "Full Name",
          "Sex",
          "Class",
          "Sessions",
          "Present (✓)",
          "Absent (A)",
          "Excused (P)",
          "Rate (%)",
          "Status",
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center", cellWidth: 18 },
        2: { cellWidth: 40, fontStyle: "bold" },
        3: { halign: "center", cellWidth: 10 },
        4: { cellWidth: 26 },
        5: { halign: "center", cellWidth: 14 },
        6: { halign: "center", textColor: [16, 185, 129], fontStyle: "bold", cellWidth: 16 },
        7: { halign: "center", textColor: [239, 68, 68], fontStyle: "bold", cellWidth: 16 },
        8: { halign: "center", textColor: [59, 130, 246], fontStyle: "bold", cellWidth: 16 },
        9: { halign: "center", fontStyle: "bold", cellWidth: 14 },
        10: { halign: "center", cellWidth: 16 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });

    // 5. Official Signature Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 220;
    const pageHeight = doc.internal.pageSize.getHeight();
    let signY = finalY + 16;
    if (signY + 30 > pageHeight) {
      doc.addPage();
      signY = 20;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Date: .......................................", 14, signY);
    doc.text("Date: .......................................", 130, signY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Classroom Instructor Signature", 14, signY + 12);
    doc.text("School Principal / Director Signature", 130, signY + 12);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("(Checked and verified)", 14, signY + 16);
    doc.text("(Approved and sealed)", 130, signY + 16);

    const cleanSchool = (school?.name || "School").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`${cleanSchool}_Attendance_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ==========================================
  // 2. EXECUTIVE MULTI-ROW EXCEL (.XLSX) EXPORT
  // ==========================================
  const handleExportExcel = () => {
    if (!data || !hasRecords) {
      alert("No attendance records available to export.");
      return;
    }

    const schoolName = school?.name || "Oakridge Academy";
    const selectedClassName = classes.find((c: any) => c.id === selectedClass)?.name || "All Classes (គ្រប់ថ្នាក់)";
    const selectedSubjectName = subjects.find((s: any) => s.id === selectedSubject)?.name || "All Subjects (គ្រប់មុខវិជ្ជា)";
    const exportDate = new Date().toISOString().split("T")[0];

    const rows: any[][] = [
      [`${schoolName.toUpperCase()} - OFFICIAL ATTENDANCE REPORT`],
      ["របាយការណ៍សវនកម្មវត្តមានសិស្សប្រចាំមុខវិជ្ជា (Classroom Attendance Audit Report)"],
      [
        `ថ្នាក់ (Class): ${selectedClassName}`,
        `មុខវិជ្ជា (Subject): ${selectedSubjectName}`,
        `កាលបរិច្ឆេទចេញរបាយការណ៍: ${exportDate}`,
      ],
      [
        `សិស្សសរុប: ${summary.totalStudents || (data.studentStats || []).length} នាក់`,
        `វត្តមាន (✓): ${summary.presentCount} ដង`,
        `ឈប់អត់ច្បាប់ (A): ${summary.absentCount} ដង`,
        `ឈប់មានច្បាប់ (P): ${summary.excusedCount} ដង`,
        `មកយឺត (L): ${summary.lateCount} ដង`,
        `អត្រាវត្តមានមធ្យម: ${summary.overallRate}%`,
      ],
      [], // blank line
      // Table Header Row
      [
        "ល.រ (No.)",
        "អត្តលេខសិស្ស (ID)",
        "គោត្តនាម-នាម (Full Name)",
        "ភេទ (Gender)",
        "ថ្នាក់ (Class)",
        "ម៉ោងសរុប (Sessions)",
        "វត្តមាន / Present (✓)",
        "ឈប់អត់ច្បាប់ / Absent (A)",
        "ឈប់មានច្បាប់ / Leave (P)",
        "មកយឺត / Late (L)",
        "អត្រាវត្តមាន / Rate (%)",
        "ស្ថានភាព / Status",
      ],
    ];

    let totalSessionsSum = 0;
    let totalPresentSum = 0;
    let totalAbsentSum = 0;
    let totalExcusedSum = 0;
    let totalLateSum = 0;

    (data.studentStats || []).forEach((s: any, idx: number) => {
      totalSessionsSum += s.totalSessions || 0;
      totalPresentSum += s.presentCount || 0;
      totalAbsentSum += s.absentCount || 0;
      totalExcusedSum += s.excusedCount || 0;
      totalLateSum += s.lateCount || 0;

      rows.push([
        idx + 1,
        s.studentNumber,
        s.studentName,
        s.gender || "M",
        s.className,
        s.totalSessions,
        s.presentCount,
        s.absentCount,
        s.excusedCount || 0,
        s.lateCount || 0,
        `${s.rate}%`,
        s.isAlert ? "ព្រមានវត្តមាន (WARNING)" : "ល្អប្រសើរ (SATISFACTORY)",
      ]);
    });

    // Summary Total Row
    rows.push([
      "សរុប / TOTAL",
      "",
      "",
      "",
      "",
      totalSessionsSum,
      totalPresentSum,
      totalAbsentSum,
      totalExcusedSum,
      totalLateSum,
      `${summary.overallRate}%`,
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Auto-fit column widths so text is never truncated
    ws["!cols"] = [
      { wch: 10 }, // No.
      { wch: 18 }, // ID
      { wch: 30 }, // Name
      { wch: 12 }, // Gender
      { wch: 22 }, // Class
      { wch: 16 }, // Sessions
      { wch: 20 }, // Present
      { wch: 20 }, // Absent
      { wch: 20 }, // Excused
      { wch: 16 }, // Late
      { wch: 18 }, // Rate
      { wch: 26 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    const cleanSchool = (school?.name || "School").replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `${cleanSchool}_Attendance_Report_${exportDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Letterhead Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wide">{school?.name || "Official Attendance Ledger"}</h1>
        <p className="text-sm">Official Classroom Attendance Audit &amp; Performance Report</p>
        <p className="text-xs text-gray-500 mt-1">
          Generated on: {new Date().toLocaleDateString()} • Verified Database Records
        </p>
      </div>

      {/* Screen Header & Export Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Attendance Reports &amp; Ledger
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              Verified Records
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real performance metrics and multi-subject attendance forms computed directly from database ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewMode === "MATRIX" ? (
            <>
              {/* Matrix PDF */}
              <button
                onClick={handleExportMatrixPDF}
                disabled={!hasRecords}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all shadow-xs disabled:opacity-40"
                title="Download STUDENT_ATTENDANT_FORM PDF (Landscape)"
              >
                <FileText className="w-4 h-4 text-rose-600" /> Export Matrix PDF
              </button>

              {/* Matrix Excel */}
              <button
                onClick={handleExportMatrixExcel}
                disabled={!hasRecords}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-40"
                title="Download Formatted STUDENT_ATTENDANT_FORM Excel (.xlsx) with Per-Subject Columns"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Matrix Excel (.xlsx)
              </button>
            </>
          ) : (
            <>
              {/* Overview PDF */}
              <button
                onClick={handleDownloadPDF}
                disabled={!hasRecords}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all shadow-xs disabled:opacity-40"
                title="Download Official Audit Report PDF"
              >
                <FileText className="w-4 h-4 text-rose-600" /> Export PDF
              </button>

              {/* Overview Excel */}
              <button
                onClick={handleExportExcel}
                disabled={!hasRecords}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-xs disabled:opacity-40"
                title="Download Multi-Row Spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel (.xlsx)
              </button>
            </>
          )}

          {/* Print Hardcopy */}
          <button
            onClick={handlePrint}
            disabled={!hasRecords}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/20 transition-all disabled:opacity-40"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* VIEW MODE TABS: MATRIX vs OVERVIEW */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 no-print">
        <button
          type="button"
          onClick={() => setViewMode("MATRIX")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            viewMode === "MATRIX"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FileSpreadsheet className={`w-4 h-4 ${viewMode === "MATRIX" ? "text-emerald-400" : "text-emerald-600"}`} />
          <span>STUDENT_ATTENDANT_FORM (Matrix View)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold">
            Cambodian Format
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("OVERVIEW")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            viewMode === "OVERVIEW"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${viewMode === "OVERVIEW" ? "text-sky-400" : "text-sky-600"}`} />
          <span>Overview Ledger &amp; Analytics</span>
        </button>
      </div>

      {/* FILTER BAR: CLASS & SUBJECT FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-sky-600" />
          <span>ចម្រាញ់តាមមុខវិជ្ជា និងថ្នាក់ (Filters):</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-semibold">ថ្នាក់:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="ALL">All Classes (គ្រប់ថ្នាក់)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter (Requested Feature!) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-semibold">មុខវិជ្ជា:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value="ALL">All Subjects (គ្រប់មុខវិជ្ជា)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Search by student name or number */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 w-44"
            />
          </div>
        </div>
      </div>

      {viewMode === "MATRIX" ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5 space-y-4">
          {/* Header Card matching exact user screenshot */}
          <div className="bg-gradient-to-r from-slate-50 via-sky-50/40 to-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  AF
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-wide font-mono">
                    STUDENT_ATTENDANT_FORM
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cambodian Academic Standard Attendance Matrix • Section Group A1
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200">
                <span>Academic Year: <strong className="text-slate-900">2025-2026</strong></span>
                <span className="text-slate-300">|</span>
                <span>Department: <strong className="text-slate-900">Computer Studies</strong></span>
                <span className="text-slate-300">|</span>
                <span>Major: <strong className="text-slate-900">Computer Science</strong></span>
                <span className="text-slate-300">|</span>
                <span>Year: <strong className="text-slate-900">1</strong></span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-600 font-bold">Group / Section:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-bold border border-sky-300 font-mono">
                  {classes.find((c) => c.id === selectedClass)?.name || "All Sections (A1)"}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">
                  Showing <strong className="text-slate-800">{filteredStudentStats.length}</strong> Students across <strong className="text-slate-800">{displaySubjects.length}</strong> Subjects
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-bold border border-red-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Absent = ឈប់អត់ច្បាប់ (A)
                </span>
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Permission = ឈប់មានច្បាប់ (P)
                </span>
              </div>
            </div>
          </div>

          {/* Hierarchical Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              {/* Double Header Level */}
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr className="border-b border-slate-300">
                  <th rowSpan={2} className="py-3 px-3 text-center w-10 border-r border-slate-200 bg-slate-100">
                    No.
                  </th>
                  <th rowSpan={2} className="py-3 px-3 min-w-[180px] border-r border-slate-200 bg-slate-100">
                    Name of Student
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-center min-w-[110px] border-r border-slate-200 bg-slate-100 font-mono">
                    ID
                  </th>
                  <th rowSpan={2} className="py-3 px-2 text-center w-12 border-r border-slate-200 bg-slate-100">
                    Sex
                  </th>
                  {displaySubjects.map((sub: any) => (
                    <th
                      key={sub.id}
                      colSpan={2}
                      className="py-2.5 px-3 text-center border-r border-slate-300 bg-slate-200/90 font-extrabold text-slate-900"
                    >
                      {sub.name}
                    </th>
                  ))}
                  <th colSpan={2} className="py-2.5 px-3 text-center bg-slate-900 text-white font-extrabold">
                    Total Tally
                  </th>
                </tr>
                <tr className="border-b border-slate-300 text-[10px]">
                  {displaySubjects.map((sub: any) => (
                    <React.Fragment key={`col-hdr-${sub.id}`}>
                      <th className="py-1.5 px-2 text-center text-red-700 bg-red-50/70 border-r border-slate-200">
                        Absent
                      </th>
                      <th className="py-1.5 px-2 text-center text-blue-700 bg-blue-50/70 border-r border-slate-300">
                        Permission
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="py-1.5 px-2 text-center text-red-300 bg-slate-900 border-r border-slate-800">
                    Absent
                  </th>
                  <th className="py-1.5 px-2 text-center text-blue-300 bg-slate-900">
                    Permission
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStudentStats.length > 0 ? (
                  filteredStudentStats.map((st: any, idx: number) => {
                    let sTotAbsent = 0;
                    let sTotPermission = 0;

                    return (
                      <tr key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          <button
                            onClick={() => handleOpenStudentView(st.studentId)}
                            className="font-bold text-slate-900 hover:text-sky-600 hover:underline text-left block"
                          >
                            {st.studentName}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 border-r border-slate-100">
                          {st.studentNumber}
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium text-slate-600 border-r border-slate-100">
                          {st.gender || "M"}
                        </td>

                        {displaySubjects.map((sub: any) => {
                          const matrix = st.subjectMatrix?.[sub.id] || { absent: 0, permission: 0 };
                          const ab = matrix.absent || 0;
                          const pe = matrix.permission || 0;
                          sTotAbsent += ab;
                          sTotPermission += pe;

                          return (
                            <React.Fragment key={`td-${st.studentId}-${sub.id}`}>
                              <td className="py-2.5 px-2 text-center border-r border-slate-100">
                                {ab > 0 ? (
                                  <span className="font-extrabold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                                    {ab}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center border-r border-slate-200">
                                {pe > 0 ? (
                                  <span className="font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                                    {pe}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono">0</span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        <td className="py-2.5 px-2 text-center font-extrabold text-red-600 bg-red-50/40 border-r border-slate-200">
                          {sTotAbsent > 0 ? sTotAbsent : <span className="text-slate-400 font-normal">0</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center font-extrabold text-blue-600 bg-blue-50/40">
                          {sTotPermission > 0 ? sTotPermission : <span className="text-slate-400 font-normal">0</span>}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4 + displaySubjects.length * 2 + 2} className="p-8 text-center text-slate-400 text-xs">
                      {loading ? "កំពុងទាញយកទិន្នន័យ..." : "មិនមានទិន្នន័យវត្តមានស្របតាមលក្ខខណ្ឌចម្រាញ់នេះទេ។"}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Total Footer Row */}
              {filteredStudentStats.length > 0 && (
                <tfoot className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 uppercase text-slate-700 tracking-wider border-r border-slate-300">
                      សរុបទាំងអស់ (TOTAL)
                    </td>
                    {displaySubjects.map((sub: any) => {
                      const colAbsent = filteredStudentStats.reduce(
                        (acc: number, s: any) => acc + (s.subjectMatrix?.[sub.id]?.absent || 0),
                        0
                      );
                      const colPermission = filteredStudentStats.reduce(
                        (acc: number, s: any) => acc + (s.subjectMatrix?.[sub.id]?.permission || 0),
                        0
                      );

                      return (
                        <React.Fragment key={`foot-${sub.id}`}>
                          <td className="py-3 px-2 text-center text-red-600 border-r border-slate-200">
                            {colAbsent}
                          </td>
                          <td className="py-3 px-2 text-center text-blue-600 border-r border-slate-300">
                            {colPermission}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="py-3 px-2 text-center text-red-700 bg-red-100/60 border-r border-slate-300 font-extrabold">
                      {filteredStudentStats.reduce((acc: number, s: any) => acc + (s.absentCount || 0), 0)}
                    </td>
                    <td className="py-3 px-2 text-center text-blue-700 bg-blue-100/60 font-extrabold">
                      {filteredStudentStats.reduce((acc: number, s: any) => acc + (s.excusedCount || 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Overall Attendance</span>
            <div className="text-2xl font-extrabold text-emerald-600">{summary.overallRate}%</div>
            <span className="text-[11px] text-slate-400">Total {summary.totalRecords} Records</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">វត្តមានសរុប (✓ / Present)</span>
            <div className="text-2xl font-extrabold text-slate-900">{summary.presentCount} ដង</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Verified Marks</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">ឈប់អត់ច្បាប់ (A / Absent)</span>
            <div className="text-2xl font-extrabold text-red-600">{summary.absentCount} ដង</div>
            <span className="text-[11px] text-red-500 font-semibold">Unexcused Absences</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">ឈប់មានច្បាប់ (P / Leave)</span>
            <div className="text-2xl font-extrabold text-blue-600">
              {summary.excusedCount} ដង
            </div>
            <span className="text-[11px] text-slate-400">{summary.lateCount} ដង មកយឺត (Late)</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FULL STUDENT ATTENDANCE ROSTER TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              តារាងសវនកម្មវត្តមានសិស្សពេញលេញ (Student Attendance Ledger)
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredStudentStats.length} student(s) • Filtered by Subject:{" "}
              <span className="font-bold text-sky-700">
                {subjects.find((s) => s.id === selectedSubject)?.name || "All Subjects"}
              </span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredStudentStats.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Student ID</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Gender</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-center">Sessions (ម៉ោង)</th>
                  <th className="py-2.5 px-3 text-center text-emerald-700 bg-emerald-50/50">វត្តមាន (✓)</th>
                  <th className="py-2.5 px-3 text-center text-red-700 bg-red-50/50">ឈប់អត់ច្បាប់ (A)</th>
                  <th className="py-2.5 px-3 text-center text-blue-700 bg-blue-50/50">ឈប់មានច្បាប់ (P)</th>
                  <th className="py-2.5 px-3 text-center text-amber-700 bg-amber-50/50">មកយឺត (L)</th>
                  <th className="py-2.5 px-3 text-center">អត្រាវត្តមាន (%)</th>
                  <th className="py-2.5 px-3 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudentStats.map((st: any, idx: number) => (
                  <tr key={st.studentId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-sky-700">{st.studentNumber}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleOpenStudentView(st.studentId)}
                        className="font-bold text-slate-900 hover:text-sky-600 hover:underline text-left"
                      >
                        {st.studentName}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-semibold">{st.gender || "M"}</td>
                    <td className="py-3 px-3 text-slate-600">{st.className}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{st.totalSessions} ដង</td>
                    <td className="py-3 px-3 text-center font-extrabold text-emerald-600 bg-emerald-50/30">
                      {st.presentCount} ដង
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-red-600 bg-red-50/30">
                      {st.absentCount} ដង
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-blue-600 bg-blue-50/30">
                      {st.excusedCount || 0} ដង
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-amber-600 bg-amber-50/30">
                      {st.lateCount || 0} ដង
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-extrabold px-2 py-0.5 rounded-full text-[11px] ${
                          st.rate >= 80
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        {st.rate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenStudentView(st.studentId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> មើលសិស្ស
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              {loading ? "កំពុងទាញយកទិន្នន័យ..." : "មិនមានទិន្នន័យស្របតាមលក្ខខណ្ឌចម្រាញ់នេះទេ។"}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Attendance Breakdown Pie Chart */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Status Distribution (ការបែងចែកស្ថានភាព)</h3>
          <div className="h-64 w-full">
            {hasRecords ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.filter((p) => p.value > 0)}
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
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No attendance status records yet.
              </div>
            )}
          </div>
        </div>

        {/* Class Attendance Comparison */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Attendance Rate by Class (អត្រាវត្តមានតាមថ្នាក់)</h3>
          <div className="h-64 w-full">
            {classData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="attendanceRate" name="Rate %" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No classes registered yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Attendance Watchlist Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 no-print">
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
          {lowAttendanceStudents.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Sessions (ដងសរុប)</th>
                  <th className="py-2.5 px-3 text-red-700 bg-red-50/50">ឈប់អត់ច្បាប់ (A)</th>
                  <th className="py-2.5 px-3 text-blue-700 bg-blue-50/50">ឈប់មានច្បាប់ (P)</th>
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
                    <td className="py-3 px-3">{st.totalSessions} ដង</td>
                    <td className="py-3 px-3 font-extrabold text-red-600 bg-red-50/30">{st.absentCount} ដង</td>
                    <td className="py-3 px-3 font-extrabold text-blue-600 bg-blue-50/30">{st.excusedCount || 0} ដង</td>
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
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <p className="font-semibold text-slate-700">No attendance alerts</p>
              <p className="text-[11px] text-slate-400">All students maintain satisfactory attendance.</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Official Signature Lines for Printed Reports */}
      {hasRecords && (
        <div className="hidden print:grid grid-cols-2 gap-12 pt-16 border-t mt-12 text-xs">
          <div>
            <div className="border-b border-gray-400 w-64 mb-2 pb-6" />
            <p className="font-bold">Reporting Faculty Signature</p>
            <p className="text-gray-500">Verified Classroom Instructor</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="border-b border-gray-400 w-64 mb-2 pb-6" />
            <p className="font-bold">Principal / Academic Dean</p>
            <p className="text-gray-500">{school?.name || "School Administration"}</p>
          </div>
        </div>
      )}

      {/* Individual Student Attendance Profile Modal (មើលសិស្សម្នាក់ៗ) */}
      {viewStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(studentDetails.records || []).map((rec: any) => (
                          <tr key={rec.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-medium text-slate-700">
                              {rec.attendanceDate} <span className="text-slate-400">P{rec.period}</span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{rec.subjectName}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                              &quot;{rec.originalSymbol || "✓"}&quot;
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  rec.status === "PRESENT"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                    : rec.status === "ABSENT"
                                    ? "bg-red-50 text-red-700 border-red-300 font-bold"
                                    : rec.status === "EXCUSED"
                                    ? "bg-blue-50 text-blue-700 border-blue-300 font-bold"
                                    : "bg-amber-50 text-amber-700 border-amber-300"
                                }`}
                              >
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

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
