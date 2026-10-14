import { NextRequest, NextResponse } from "next/server";
import { dbStore, SymbolConfigModel } from "@/lib/db-store";

export async function GET() {
  const symbols = dbStore.getSymbols();
  return NextResponse.json({ symbols });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbols } = body;

    if (!Array.isArray(symbols)) {
      return NextResponse.json({ error: "Invalid symbol configurations array" }, { status: 400 });
    }

    dbStore.updateSymbols(symbols);

    dbStore.addAuditLog({
      action: "UPDATE_SYMBOL_CONFIG",
      entityType: "AttendanceSymbolConfig",
      userId: "usr_admin",
      userName: "Dr. Sarah Jenkins",
      details: JSON.stringify({ count: symbols.length }),
    });

    return NextResponse.json({ success: true, symbols: dbStore.getSymbols() });
  } catch {
    return NextResponse.json({ error: "Failed to update symbol configuration" }, { status: 500 });
  }
}
