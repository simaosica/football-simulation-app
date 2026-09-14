import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import StartPageClient from "./startPageClient";

export default async function StartPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return <StartPageClient />;
}