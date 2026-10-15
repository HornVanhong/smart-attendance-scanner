import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export async function GET(req: NextRequest) {
  await ensureSystemInitialized();
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const whereClause: any = {};
  if (classId && classId !== "ALL") whereClause.classId = classId;
  if (status && status !== "ALL") whereClause.status = status;
  if (search) {
    whereClause.OR = [
      { fullName: { contains: search } },
      { studentNumber: { contains: search } },
    ];
  }

  const students = await prisma.student.findMany({
    where: whereClause,
    include: {
      class: {
        select: { name: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const formatted = students.map((s) => ({
    id: s.id,
    schoolId: s.schoolId,
    classId: s.classId,
    className: s.class?.name || "Unassigned",
    studentNumber: s.studentNumber,
    fullName: s.fullName,
    gender: s.gender as "M" | "F" | "Other",
    enrollmentDate: s.enrollmentDate.toISOString().split("T")[0],
    status: s.status as "ACTIVE" | "INACTIVE" | "ARCHIVED",
    email: s.email || undefined,
    phone: s.phone || undefined,
  }));

  return NextResponse.json({ students: formatted });
}

export async function POST(req: NextRequest) {
  try {
    const school = await ensureSystemInitialized();
    const body = await req.json();
    const { studentNumber, fullName, gender, classId, email, phone, enrollmentDate, status } = body;

    if (!studentNumber || !fullName || !classId) {
      return NextResponse.json(
        { error: "Student Number, Full Name, and Class are required" },
        { status: 400 }
      );
    }

    const cleanNum = studentNumber.trim().toUpperCase();

    // Check duplicate
    const existing = await prisma.student.findFirst({
      where: {
        schoolId: school.id,
        studentNumber: cleanNum,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Student number "${cleanNum}" already exists.` },
        { status: 409 }
      );
    }

    const newStudent = await prisma.student.create({
      data: {
        schoolId: school.id,
        classId,
        studentNumber: cleanNum,
        fullName: fullName.trim(),
        gender: gender || "M",
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
        status: status || "ACTIVE",
      },
      include: {
        class: {
          select: { name: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        action: "STUDENT_CREATED",
        entityType: "Student",
        entityId: newStudent.id,
        details: JSON.stringify({ studentNumber: cleanNum, fullName: newStudent.fullName, classId }),
      },
    });

    return NextResponse.json(
      {
        student: {
          ...newStudent,
          className: newStudent.class?.name || "Unassigned",
          enrollmentDate: newStudent.enrollmentDate.toISOString().split("T")[0],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
