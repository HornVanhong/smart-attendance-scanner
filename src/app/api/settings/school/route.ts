import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export async function GET() {
  const school = await ensureSystemInitialized();
  return NextResponse.json({ school });
}

export async function PUT(req: NextRequest) {
  try {
    const school = await ensureSystemInitialized();
    const body = await req.json();
    const { name, code, address, phone, email } = body;

    const updated = await prisma.school.update({
      where: { id: school.id },
      data: {
        name: name?.trim() || school.name,
        code: code?.trim() || school.code,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, school: updated });
  } catch (error) {
    console.error("Error updating school:", error);
    return NextResponse.json({ error: "Failed to update school profile" }, { status: 500 });
  }
}
