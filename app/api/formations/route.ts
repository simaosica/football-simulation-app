import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CREATE formation
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, baseFormation, type, players } = await req.json();

  const formation = await prisma.formation.create({
    data: {
      name,
      baseFormation,
      type,
      players,
      userId: session.user.id,
    },
  });

  return NextResponse.json(formation);
}

// GET formations
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formations = await prisma.formation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(formations);
}

// DELETE formation
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  await prisma.formation.delete({
    where: {
      id,
      userId: session.user.id
    },
  });

  return NextResponse.json({ success: true });
}