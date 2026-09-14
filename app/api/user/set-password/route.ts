import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await req.json();

  if (!password || password.length < 8 || password.length > 12) {
    return Response.json(
      { error: "Password must be between 8 and 12 characters." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { accounts: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Check if password already exists
  if (user.password) {
    return Response.json(
      { error: "Password already set." },
      { status: 400 }
    );
  }

  // Ensure user logged in via Google
  const hasGoogle = user.accounts.some(
    (account) => account.provider === "google"
  );

  if (!hasGoogle) {
    return Response.json(
      { error: "Only Google accounts can set password here." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
  });

  return Response.json({ success: true });
}