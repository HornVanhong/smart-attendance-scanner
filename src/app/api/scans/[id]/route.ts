export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

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
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    const sheet = await prisma.attendanceSheet.findUnique({
      where: { id: sheetId },
      include: {
        cells: { select: { id: true } },
      },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Attendance sheet not found" }, { status: 404 });
    }

    const cellIds = sheet.cells.map((c) => c.id);

    // 1. Transactionally remove all records linked to this scan sheet
    await prisma.$transaction(async (tx) => {
      // Delete any corrections linked to these cells or records
      if (cellIds.length > 0) {
        await tx.attendanceCorrection.deleteMany({
          where: {
            OR: [
              { scanCellId: { in: cellIds } },
              { attendanceRecord: { sourceSheetId: sheetId } },
            ],
          },
        });
      }

      // Delete all attendance records created from this scan sheet
      await tx.attendanceRecord.deleteMany({
        where: {
          OR: [
            { sourceSheetId: sheetId },
            ...(cellIds.length > 0 ? [{ sourceScanCellId: { in: cellIds } }] : []),
          ],
        },
      });

      // Delete scan cells
      await tx.scanCell.deleteMany({
        where: { attendanceSheetId: sheetId },
      });

      // Delete attendance sheet
      await tx.attendanceSheet.delete({
        where: { id: sheetId },
      });

      // Add audit log
      await tx.auditLog.create({
        data: {
          schoolId: sheet.schoolId,
          userId: sheet.uploadedById,
          action: "SCAN_SHEET_DELETED",
          entityType: "AttendanceSheet",
          entityId: sheetId,
          details: JSON.stringify({
            originalFileName: sheet.originalFileName,
            deletedCells: cellIds.length,
            reason: "User requested removal of scan to rescan new data",
          }),
        },
      });
    });

    // 2. Delete uploaded physical file from disk if stored locally
    if (sheet.imageStorageKey && sheet.imageStorageKey.startsWith("/uploads/")) {
      try {
        const filePath = path.join(process.cwd(), "public", sheet.imageStorageKey.replace(/^\//, ""));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.warn("Could not delete file from disk:", fileErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Scan and all associated attendance records removed successfully. You can now scan new data.",
    });
  } catch (error: any) {
    console.error("Error deleting scan:", error);
    return NextResponse.json(
      { error: "Failed to delete scan: " + (error?.message || error) },
      { status: 500 }
    );
  }
}

