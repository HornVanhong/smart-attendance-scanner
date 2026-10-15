import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSystemInitialized();
  const subjects = await prisma.subject.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  try {
    const school = await ensureSystemInitialized();
    const body = await req.json();
    const { name, code, periodsCount } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and Code are required" }, { status: 400 });
    }

    const newSubject = await prisma.subject.create({
      data: {
        schoolId: school.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        periodsCount: Number(periodsCount) || 4,
      },
    });

    return NextResponse.json({ subject: newSubject }, { status: 201 });
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
