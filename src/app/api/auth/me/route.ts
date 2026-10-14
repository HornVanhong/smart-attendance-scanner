import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db-store";

// Current active session simulation with role-switch support for review & testing
let currentUserId = "usr_teacher_chang";

export async function GET() {
  const user = dbStore.getUserById(currentUserId) || dbStore.getUsers()[0];
  const school = dbStore.getSchool();

  return NextResponse.json({
    user,
    school,
    availableUsers: dbStore.getUsers(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.userId && dbStore.getUserById(body.userId)) {
      currentUserId = body.userId;
      const user = dbStore.getUserById(currentUserId);
      return NextResponse.json({ success: true, user });
    }
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to switch user" }, { status: 500 });
  }
}
