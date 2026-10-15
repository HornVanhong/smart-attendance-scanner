import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceValidationService } from "@/services/attendance-validation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id: params.id },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      uploadedBy: { select: { name: true } },
    },
  });

  if (!sheet) {
    return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
  }

  const cells = await prisma.scanCell.findMany({
    where: { attendanceSheetId: params.id },
    include: {
      student: { select: { fullName: true, gender: true } },
    },
    orderBy: [{ rowIndex: "asc" }, { period: "asc" }],
  });

  const formattedCells = cells.map((c) => {
    let bbox = { x: 0, y: 0, w: 50, h: 25 };
    try {
      if (c.cellBoundingBox) bbox = JSON.parse(c.cellBoundingBox);
    } catch {}

    return {
      id: c.id,
      attendanceSheetId: c.attendanceSheetId,
      studentId: c.studentId || undefined,
      matchedStudentName: c.student?.fullName || c.rawStudentName || "Student",
      rawStudentName: c.rawStudentName || undefined,
      rawStudentNumber: c.rawStudentNumber || undefined,
      gender: c.student?.gender || "M",
      rowIndex: c.rowIndex,
      columnIndex: c.columnIndex,
      dateString: c.dateString || undefined,
      period: c.period,
      cellBoundingBox: bbox,
      recognizedText: c.recognizedText || undefined,
      recognizedSymbol: c.recognizedSymbol || undefined,
      interpretedStatus: c.interpretedStatus as any,
      confidenceScore: c.confidenceScore,
      reviewStatus: c.reviewStatus as any,
      isEdited: c.isEdited,
    };
  });

  const validation = AttendanceValidationService.validateScanCells(formattedCells as any);

  return NextResponse.json({
    sheet: {
      ...sheet,
      className: sheet.class?.name || "Unassigned",
      subjectName: sheet.subject?.name || "Unassigned",
      uploadedByName: sheet.uploadedBy?.name || "Staff",
      uploadedAt: sheet.uploadedAt.toISOString(),
      processedAt: sheet.processedAt?.toISOString() || null,
      sheetDate: sheet.sheetDate ? sheet.sheetDate.toISOString().split("T")[0] : undefined,
    },
    cells: formattedCells,
    validation,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: params.id },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
    }

    const body = await req.json();
    const { cells, singleCellUpdate, isDraft } = body;

    if (singleCellUpdate) {
      await prisma.scanCell.update({
        where: { id: singleCellUpdate.cellId },
        data: {
          interpretedStatus: singleCellUpdate.interpretedStatus,
          studentId: singleCellUpdate.studentId || undefined,
          reviewStatus: "CORRECTED",
          isEdited: true,
          confidenceScore: 1.0,
        },
      });
    } else if (Array.isArray(cells)) {
      // Bulk update cells
      for (const cell of cells) {
        await prisma.scanCell.update({
          where: { id: cell.id },
          data: {
            interpretedStatus: cell.interpretedStatus,
            studentId: cell.studentId || undefined,
            reviewStatus: cell.reviewStatus || "CORRECTED",
            isEdited: cell.isEdited || false,
            confidenceScore: cell.confidenceScore || 1.0,
          },
        }).catch(() => {});
      }
    }

    if (isDraft) {
      await prisma.attendanceSheet.update({
        where: { id: params.id },
        data: { verificationStatus: "IN_REVIEW" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating scan results:", error);
    return NextResponse.json({ error: "Failed to update scan results" }, { status: 500 });
  }
}
