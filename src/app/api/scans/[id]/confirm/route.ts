import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: params.id },
      include: {
        cells: {
          include: { student: true },
        },
      },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const verifiedById = body.verifiedById || sheet.uploadedById;
    const defaultDate = sheet.sheetDate || new Date();

    let committedCount = 0;

    for (const cell of sheet.cells) {
      if (!cell.studentId) continue;

      const dateObj = cell.dateString ? new Date(cell.dateString) : defaultDate;
      const classId = sheet.classId || cell.student?.classId;
      if (!classId) continue;

      const subjectId = sheet.subjectId || "sub_general";

      // Ensure subject exists if sub_general
      let targetSubjectId = sheet.subjectId;
      if (!targetSubjectId) {
        let firstSub = await prisma.subject.findFirst();
        if (!firstSub) {
          firstSub = await prisma.subject.create({
            data: {
              schoolId: sheet.schoolId,
              name: "General Studies",
              code: "GEN-101",
            },
          });
        }
        targetSubjectId = firstSub.id;
      }

      const validStatus =
        cell.interpretedStatus === "PRESENT" ||
        cell.interpretedStatus === "ABSENT" ||
        cell.interpretedStatus === "LATE" ||
        cell.interpretedStatus === "EXCUSED"
          ? cell.interpretedStatus
          : "PRESENT";

      // Upsert into AttendanceRecord
      await prisma.attendanceRecord.upsert({
        where: {
          unique_student_attendance: {
            studentId: cell.studentId,
            attendanceDate: dateObj,
            subjectId: targetSubjectId,
            period: cell.period,
            classId: classId,
          },
        },
        update: {
          status: validStatus,
          originalSymbol: cell.recognizedSymbol,
          isVerified: true,
          verifiedById,
          verifiedAt: new Date(),
          sourceSheetId: sheet.id,
          sourceScanCellId: cell.id,
        },
        create: {
          schoolId: sheet.schoolId,
          studentId: cell.studentId,
          classId: classId,
          subjectId: targetSubjectId,
          attendanceDate: dateObj,
          period: cell.period,
          status: validStatus,
          originalSymbol: cell.recognizedSymbol,
          isVerified: true,
          verifiedById,
          verifiedAt: new Date(),
          sourceSheetId: sheet.id,
          sourceScanCellId: cell.id,
        },
      });

      committedCount++;
    }

    // Update sheet status to VERIFIED
    await prisma.attendanceSheet.update({
      where: { id: sheet.id },
      data: { verificationStatus: "VERIFIED" },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: sheet.schoolId,
        action: "ATTENDANCE_VERIFIED",
        entityType: "AttendanceSheet",
        entityId: sheet.id,
        userId: verifiedById,
        details: JSON.stringify({ committedRecords: committedCount, sheetId: sheet.id }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance records confirmed and verified successfully",
      totalRecordsCreated: committedCount,
    });
  } catch (error) {
    console.error("Error confirming attendance:", error);
    return NextResponse.json({ error: "Failed to finalize attendance records" }, { status: 500 });
  }
}
