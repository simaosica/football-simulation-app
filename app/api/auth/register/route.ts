import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Email verification (currently disabled)
// import crypto from "crypto";
// import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

    const lowerEmail = email.trim().toLowerCase();

    if (password.length < 8 || password.length > 12) {
      return NextResponse.json(
        { error: "Password must be 8-12 characters long" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    // If user is a brand new user
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email: lowerEmail,
          password: hashedPassword,
          emailVerified: new Date(), // Auto-verified until email verification is enabled
        },
      });

      /*
       * Email verification
       * ------------------
       * Disabled in the current version. Accounts are automatically
       * verified during registration.
       *
       * The implementation was considered for the project and is
       * retained here for reference.
       */
      /*

      const token = crypto.randomBytes(32).toString("hex");

      await prisma.verificationToken.create({
        data: {
          identifier: lowerEmail,
          token,
          expires: new Date(Date.now() + 1000 * 60 * 60),
        },
      });

      const verifyUrl = `${process.env.NEXTAUTH_URL}/api/verify?token=${token}`;
      const resend = new Resend(process.env.RESEND_API_KEY!);

      await resend.emails.send({
        from: "Football Simulation <onboarding@resend.dev>",
        to: lowerEmail,
        subject: "Verify your account",
        html: `
          <h2>Welcome to Football Simulation ⚽</h2>
          <p>Please click below to verify your account:</p>
          <a href="${verifyUrl}">Verify Account</a>
        `,
      });*/

      return NextResponse.json({ success: true });
    }

    // Account exists but was created with Google
    if (!existingUser.password) {
      return NextResponse.json(
        { error: "This account was created with Google. Please sign in with Google." },
        { status: 409 }
      );
    }

    // Account exists and already has a password
    return NextResponse.json(
      { error: "User already exists" },
      { status: 409 }
    );

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}