import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: { class: { select: { name: true } } },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({
    student: {
      ...student,
      className: student.class?.name || "Unassigned",
      enrollmentDate: student.enrollmentDate.toISOString().split("T")[0],
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
