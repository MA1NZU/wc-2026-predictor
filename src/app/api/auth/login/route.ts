import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { comparePassword, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const snap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const doc = snap.docs[0];
    const userData = doc.data();

    const valid = await comparePassword(password, userData.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = {
      id: doc.id,
      email: userData.email,
      username: userData.username,
      isAdmin: userData.isAdmin || false,
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
