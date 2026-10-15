import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureSystemInitialized();
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const subjectId = searchParams.get("subjectId");
  const dateStr = searchParams.get("date");
  const status = searchParams.get("status");
  const studentId = searchParams.get("studentId");

  const whereClause: any = {};
  if (classId && classId !== "ALL") whereClause.classId = classId;
  if (subjectId && subjectId !== "ALL") whereClause.subjectId = subjectId;
  if (status && status !== "ALL") whereClause.status = status;
  if (studentId) whereClause.studentId = studentId;

  if (dateStr) {
    const startDate = new Date(dateStr);
    const endDate = new Date(dateStr);
    endDate.setDate(endDate.getDate() + 1);
    whereClause.attendanceDate = {
      gte: startDate,
      lt: endDate,
    };
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      student: { select: { fullName: true, studentNumber: true } },
      class: { select: { name: true } },
      subject: { select: { name: true } },
      verifiedBy: { select: { name: true } },
    },
    orderBy: [{ attendanceDate: "desc" }, { period: "asc" }],
  });

  const formatted = records.map((r) => ({
    id: r.id,
    schoolId: r.schoolId,
    studentId: r.studentId,
    studentName: r.student?.fullName || "Student",
    studentNumber: r.student?.studentNumber || "N/A",
    classId: r.classId,
    className: r.class?.name || "Class",
    subjectId: r.subjectId,
    subjectName: r.subject?.name || "Subject",
    attendanceDate: r.attendanceDate.toISOString().split("T")[0],
    period: r.period,
    status: r.status,
    originalSymbol: r.originalSymbol || undefined,
    sourceSheetId: r.sourceSheetId || undefined,
    sourceScanCellId: r.sourceScanCellId || undefined,
    isVerified: r.isVerified,
    verifiedById: r.verifiedById || undefined,
    verifiedByName: r.verifiedBy?.name || "Staff",
    verifiedAt: r.verifiedAt?.toISOString() || undefined,
    remarks: r.remarks || undefined,
  }));

  return NextResponse.json({ records: formatted });
}

export async function POST(req: NextRequest) {
  try {
    const school = await ensureSystemInitialized();
    const currentUser = await prisma.user.findFirst();
    const body = await req.json();
    const { studentId, classId, subjectId, attendanceDate, period, status, remarks } = body;

    if (!studentId || !classId || !subjectId || !attendanceDate || !status) {
      return NextResponse.json({ error: "Missing required attendance fields" }, { status: 400 });
    }

    const dateObj = new Date(attendanceDate);

    const record = await prisma.attendanceRecord.upsert({
      where: {
        unique_student_attendance: {
          studentId,
          attendanceDate: dateObj,
          subjectId,
          period: Number(period) || 1,
          classId,
        },
      },
      update: {
        status,
        remarks: remarks?.trim() || null,
        isVerified: true,
        verifiedById: currentUser?.id || "usr_teacher",
        verifiedAt: new Date(),
      },
      create: {
        schoolId: school.id,
        studentId,
        classId,
        subjectId,
        attendanceDate: dateObj,
        period: Number(period) || 1,
        status,
        originalSymbol: status === "PRESENT" ? "✓" : status.charAt(0),
        isVerified: true,
        verifiedById: currentUser?.id || "usr_teacher",
        verifiedAt: new Date(),
        remarks: remarks?.trim() || null,
      },
      include: {
        student: { select: { fullName: true, studentNumber: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    return NextResponse.json(
      {
        record: {
          ...record,
          studentName: record.student?.fullName || "Student",
          studentNumber: record.student?.studentNumber || "N/A",
          className: record.class?.name || "Class",
          subjectName: record.subject?.name || "Subject",
          attendanceDate: record.attendanceDate.toISOString().split("T")[0],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating attendance record:", error);
    return NextResponse.json({ error: "Failed to create attendance record" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const sheetId = searchParams.get("sheetId");

    if (id) {
      await prisma.attendanceRecord.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, message: "Attendance record deleted" });
    }

    if (sheetId) {
      const deleted = await prisma.attendanceRecord.deleteMany({
        where: { sourceSheetId: sheetId },
      });
      return NextResponse.json({ success: true, count: deleted.count });
    }

    return NextResponse.json({ error: "Missing id or sheetId parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Error deleting attendance record:", error);
    return NextResponse.json({ error: "Failed to delete record: " + (error?.message || error) }, { status: 500 });
  }
}

