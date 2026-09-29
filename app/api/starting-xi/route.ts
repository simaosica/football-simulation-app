import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const startingXI = await prisma.startingXI.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json(startingXI);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();

  const { formation, players } = body;

  if (!formation || !players) {
    return NextResponse.json(
      { error: "Formation and players are required" },
      { status: 400 }
    );
  }

  const startingXI = await prisma.startingXI.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      formation,
      players,
    },
    update: {
      formation,
      players,
    },
  });

  return NextResponse.json(startingXI);
}