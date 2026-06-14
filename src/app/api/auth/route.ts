import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const existingEmail = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!existingEmail.empty) {
      return NextResponse.json({ error: "Email already taken" }, { status: 400 });
    }

    const existingUsername = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (!existingUsername.empty) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const userRef = db.collection("users").doc();
    await userRef.set({
      email,
      username,
      password: hashed,
      isAdmin: false,
      createdAt: new Date(),
    });

    const user = {
      id: userRef.id,
      email,
      username,
      isAdmin: false,
    };

    const token = await signToken(user.id, user.email, user.isAdmin);
    const response = NextResponse.json({ user });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
