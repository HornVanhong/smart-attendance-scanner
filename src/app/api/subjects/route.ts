import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

export async function GET() {
  const subjects = dbStore.getSubjects();
  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, periodsCount } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and Code are required" }, { status: 400 });
    }

    const newSubject = dbStore.createSubject({
      schoolId: dbStore.getSchool().id,
      name,
      code: code.toUpperCase(),
      periodsCount: periodsCount || 4,
    });

    return NextResponse.json({ subject: newSubject }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}
