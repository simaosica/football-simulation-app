import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { accounts: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user has Google account linked
  const hasGoogle = user.accounts.some(
    (account) => account.provider === "google"
  );

  // Only show modal if user logged in via Google and has no password set
  const needsPasswordSetup = hasGoogle && !user.password;

  return Response.json({
    needsPasswordSetup,
  });
}