import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function GET() {
  const school = await ensureSystemInitialized();
  const symbols = await prisma.attendanceSymbolConfig.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ symbols });
}

export async function POST(req: NextRequest) {
  try {
    const school = await ensureSystemInitialized();
    const body = await req.json();
    const { symbols } = body;

    if (!Array.isArray(symbols)) {
      return NextResponse.json({ error: "Invalid symbol configurations array" }, { status: 400 });
    }

    // Upsert or replace symbols in Prisma
    for (const s of symbols) {
      if (!s.symbol) continue;
      await prisma.attendanceSymbolConfig.upsert({
        where: {
          schoolId_symbol: {
            schoolId: school.id,
            symbol: s.symbol.trim(),
          },
        },
        update: {
          mappedStatus: s.mappedStatus,
          description: s.description || null,
        },
        create: {
          schoolId: school.id,
          symbol: s.symbol.trim(),
          mappedStatus: s.mappedStatus,
          description: s.description || null,
          isDefault: s.isDefault || false,
        },
      });
    }

    const updated = await prisma.attendanceSymbolConfig.findMany({
      where: { schoolId: school.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, symbols: updated });
  } catch (error) {
    console.error("Error updating symbol configs:", error);
    return NextResponse.json({ error: "Failed to update symbol configuration" }, { status: 500 });
  }
}
