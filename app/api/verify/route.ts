import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const existingToken = await prisma.verificationToken.findUnique({
      where: { token: token },
    });

    if (!existingToken) {
      return NextResponse.redirect(new URL("/?error=invalid", req.url));
    }

    if (existingToken.expires < new Date()) {
      return NextResponse.redirect(new URL("/?error=expired", req.url));
    }

    await prisma.user.update({
      where: { email: existingToken.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({
      where: { token: token },
    });

    return NextResponse.redirect(new URL("/?verified=true", req.url));

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}