import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") || undefined;
  const subjectId = searchParams.get("subjectId") || undefined;
  const date = searchParams.get("date") || undefined;
  const status = searchParams.get("status") || undefined;
  const studentId = searchParams.get("studentId") || undefined;

  const records = dbStore.getRecords({ classId, subjectId, date, status, studentId });
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, classId, subjectId, attendanceDate, period, status, remarks } = body;

    if (!studentId || !classId || !subjectId || !attendanceDate || !status) {
      return NextResponse.json({ error: "Missing required attendance fields" }, { status: 400 });
    }

    const student = dbStore.getStudentById(studentId);
    const cls = dbStore.getClassById(classId);
    const sub = dbStore.getSubjectById(subjectId);

    const record = dbStore.createRecord({
      schoolId: dbStore.getSchool().id,
      studentId,
      studentName: student?.fullName || "Unknown",
      studentNumber: student?.studentNumber || "N/A",
      classId,
      className: cls?.name || "Unknown",
      subjectId,
      subjectName: sub?.name || "Unknown",
      attendanceDate,
      period: period || 1,
      status,
      originalSymbol: status === "PRESENT" ? "✓" : status.charAt(0),
      isVerified: true,
      verifiedById: "usr_teacher_chang",
      verifiedByName: "Prof. Michael Chang",
      verifiedAt: new Date().toISOString(),
      remarks,
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create attendance record" }, { status: 500 });
  }
}
