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

    // Look up verified user in database to ensure FK constraint satisfaction
    let verifiedUser = body.verifiedById
      ? await prisma.user.findUnique({ where: { id: body.verifiedById } })
      : null;

    if (!verifiedUser && sheet.uploadedById) {
      verifiedUser = await prisma.user.findUnique({ where: { id: sheet.uploadedById } });
    }

    if (!verifiedUser) {
      verifiedUser = await prisma.user.findFirst();
    }

    const verifiedById = verifiedUser?.id || null;
    const defaultDate = sheet.sheetDate || new Date();

    let committedCount = 0;

    for (const cell of sheet.cells) {
      const classId = sheet.classId || cell.student?.classId;
      if (!classId) continue;

      let studentId = cell.studentId;
      if (!studentId) {
        // Auto-match or create student if name exists
        const studentName = cell.rawStudentName;
        if (studentName) {
          let matched = await prisma.student.findFirst({
            where: {
              classId,
              fullName: studentName,
            },
          });
          if (!matched) {
            matched = await prisma.student.create({
              data: {
                schoolId: sheet.schoolId,
                classId,
                fullName: studentName,
                studentNumber: cell.rawStudentNumber || `STU-${Date.now().toString().slice(-4)}`,
                gender: "M",
                status: "ACTIVE",
              },
            });
          }
          studentId = matched.id;
        }
      }

      if (!studentId) continue;

      // Ensure target subject exists
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

      const dateObj =
        cell.dateString && !isNaN(new Date(cell.dateString).getTime())
          ? new Date(cell.dateString)
          : defaultDate;

      const validStatus =
        cell.interpretedStatus === "PRESENT" ||
        cell.interpretedStatus === "ABSENT" ||
        cell.interpretedStatus === "LATE" ||
        cell.interpretedStatus === "EXCUSED"
          ? cell.interpretedStatus
          : "PRESENT";

      // Upsert into master AttendanceRecord ledger
      await prisma.attendanceRecord.upsert({
        where: {
          unique_student_attendance: {
            studentId,
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
          studentId,
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

    if (verifiedById) {
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
    }

    return NextResponse.json({
      success: true,
      message: "Attendance records confirmed and verified successfully",
      totalRecordsCreated: committedCount,
    });
  } catch (error: any) {
    console.error("Error confirming attendance:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to finalize attendance records" },
      { status: 500 }
    );
  }
}
