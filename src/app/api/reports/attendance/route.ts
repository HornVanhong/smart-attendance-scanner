import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export async function GET(req: NextRequest) {
  await ensureSystemInitialized();
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const subjectId = searchParams.get("subjectId");

  const whereClause: any = {};
  if (classId && classId !== "ALL") whereClause.classId = classId;
  if (subjectId && subjectId !== "ALL") whereClause.subjectId = subjectId;

  // Real Attendance Records
  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      student: { select: { fullName: true, studentNumber: true } },
      class: { select: { name: true } },
    },
  });

  const students = await prisma.student.findMany({
    where: classId && classId !== "ALL" ? { classId } : {},
    include: { class: { select: { name: true } } },
  });

  const classes = await prisma.class.findMany({
    include: { _count: { select: { students: true } } },
  });

  const sheets = await prisma.attendanceSheet.findMany();

  // Metrics calculation strictly from real database records
  const totalRecords = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const excusedCount = records.filter((r) => r.status === "EXCUSED").length;

  const overallRate = totalRecords > 0 ? Math.round(((presentCount + lateCount) / totalRecords) * 100) : 0;

  // Real Class Breakdown
  const classBreakdown = classes.map((c) => {
    const classRecs = records.filter((r) => r.classId === c.id);
    const cTotal = classRecs.length;
    const cPresent = classRecs.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    const rate = cTotal > 0 ? Math.round((cPresent / cTotal) * 100) : 0;

    return {
      id: c.id,
      name: c.name,
      totalStudents: c._count.students,
      recordsCount: cTotal,
      attendanceRate: rate,
    };
  });

  // Real Daily Trends (group by day of week)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendsMap = new Map<string, { present: number; absent: number; late: number; total: number }>();

  ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((d) => {
    trendsMap.set(d, { present: 0, absent: 0, late: 0, total: 0 });
  });

  records.forEach((r) => {
    const day = dayNames[r.attendanceDate.getDay()];
    if (trendsMap.has(day)) {
      const item = trendsMap.get(day)!;
      item.total++;
      if (r.status === "PRESENT") item.present++;
      else if (r.status === "ABSENT") item.absent++;
      else if (r.status === "LATE") item.late++;
    }
  });

  const trends = Array.from(trendsMap.entries()).map(([day, counts]) => ({
    day,
    present: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0,
    absent: counts.total > 0 ? Math.round((counts.absent / counts.total) * 100) : 0,
    late: counts.total > 0 ? Math.round((counts.late / counts.total) * 100) : 0,
  }));

  // Student Attendance Statistics
  const studentStats = students.map((st) => {
    const stRecs = records.filter((r) => r.studentId === st.id);
    const total = stRecs.length;
    const present = stRecs.filter((r) => r.status === "PRESENT").length;
    const absent = stRecs.filter((r) => r.status === "ABSENT").length;
    const excused = stRecs.filter((r) => r.status === "EXCUSED").length;
    const late = stRecs.filter((r) => r.status === "LATE").length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return {
      studentId: st.id,
      studentName: st.fullName,
      studentNumber: st.studentNumber,
      gender: st.gender || "M",
      className: st.class?.name || "Unassigned",
      totalSessions: total,
      presentCount: present,
      absentCount: absent,
      excusedCount: excused,
      lateCount: late,
      rate,
      isAlert: total > 0 && rate < 80,
    };
  });

  const lowAttendanceAlerts = studentStats.filter((s) => s.isAlert);

  return NextResponse.json({
    summary: {
      totalRecords,
      overallRate,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      totalStudents: students.length,
      totalClasses: classes.length,
      scansCount: sheets.length,
      scansRequiringReview: sheets.filter((s) => s.verificationStatus === "IN_REVIEW").length,
    },
    classBreakdown,
    trends,
    studentStats,
    lowAttendanceAlerts,
  });
}
