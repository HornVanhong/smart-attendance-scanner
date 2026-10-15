import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      class: { select: { name: true } },
      attendanceRecords: {
        include: {
          subject: { select: { name: true, code: true } },
          verifiedBy: { select: { name: true } },
          sourceSheet: { select: { id: true, originalFileName: true } },
        },
        orderBy: [{ attendanceDate: "desc" }, { period: "asc" }],
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const recs = student.attendanceRecords || [];
  const totalSessions = recs.length;
  const presentCount = recs.filter((r) => r.status === "PRESENT").length;
  const absentCount = recs.filter((r) => r.status === "ABSENT").length;
  const excusedCount = recs.filter((r) => r.status === "EXCUSED").length;
  const lateCount = recs.filter((r) => r.status === "LATE").length;
  const rate = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 100;

  return NextResponse.json({
    student: {
      ...student,
      className: student.class?.name || "Unassigned",
      enrollmentDate: student.enrollmentDate.toISOString().split("T")[0],
      stats: {
        totalSessions,
        presentCount,
        absentCount,
        excusedCount,
        lateCount,
        rate,
      },
      records: recs.map((r) => ({
        id: r.id,
        date: r.attendanceDate.toISOString().split("T")[0],
        period: r.period,
        subjectName: r.subject.name,
        subjectCode: r.subject.code,
        status: r.status,
        originalSymbol: r.originalSymbol,
        isVerified: r.isVerified,
        verifiedByName: r.verifiedBy?.name,
        sourceSheetId: r.sourceSheetId,
      })),
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updateData: any = {};
    if (body.studentNumber) updateData.studentNumber = body.studentNumber.trim().toUpperCase();
    if (body.fullName) updateData.fullName = body.fullName.trim();
    if (body.gender) updateData.gender = body.gender;
    if (body.classId) updateData.classId = body.classId;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.status) updateData.status = body.status;

    const updated = await prisma.student.update({
      where: { id: params.id },
      data: updateData,
      include: { class: { select: { name: true } } },
    });

    return NextResponse.json({
      student: {
        ...updated,
        className: updated.class?.name || "Unassigned",
        enrollmentDate: updated.enrollmentDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.student.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
