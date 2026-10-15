import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSystemInitialized } from "@/lib/db-init";

export const dynamic = "force-dynamic";

let currentUserId = "usr_teacher";

export async function GET() {
  await ensureSystemInitialized();

  let user = await prisma.user.findUnique({ where: { id: currentUserId } });
  if (!user) {
    user = await prisma.user.findFirst();
    if (user) currentUserId = user.id;
  }

  const school = await prisma.school.findFirst();
  const availableUsers = await prisma.user.findMany();

  return NextResponse.json({
    user,
    school,
    availableUsers,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.userId) {
      const user = await prisma.user.findUnique({ where: { id: body.userId } });
      if (user) {
        currentUserId = user.id;
        return NextResponse.json({ success: true, user });
      }
    }
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to switch user" }, { status: 500 });
  }
}
