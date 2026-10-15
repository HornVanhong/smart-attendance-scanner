import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    await prisma.attendanceSheet.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scan:", error);
    return NextResponse.json({ error: "Attendance sheet not found or cannot be deleted" }, { status: 404 });
  }
}
