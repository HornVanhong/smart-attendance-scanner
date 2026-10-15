import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export async function GET() {
  await ensureSystemInitialized();
  const classes = await prisma.class.findMany({
    include: {
      _count: {
        select: { students: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const formatted = classes.map((c) => ({
    id: c.id,
    schoolId: c.schoolId,
    name: c.name,
    gradeLevel: c.gradeLevel,
    academicYear: c.academicYear,
    teacherId: c.teacherId,
    studentCount: c._count.students,
  }));

  return NextResponse.json({ classes: formatted });
}

export async function POST(req: NextRequest) {
  try {
    const school = await ensureSystemInitialized();
    const body = await req.json();
    const { name, gradeLevel, academicYear, teacherId } = body;

    if (!name || !gradeLevel) {
      return NextResponse.json({ error: "Name and Grade Level are required" }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        schoolId: school.id,
        name: name.trim(),
        gradeLevel: gradeLevel.trim(),
        academicYear: academicYear?.trim() || "2024-2025",
        teacherId: teacherId || null,
      },
    });

    return NextResponse.json({ class: { ...newClass, studentCount: 0 } }, { status: 201 });
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
