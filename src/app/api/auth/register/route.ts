import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { hashPassword, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if email exists
    const emailQuery = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!emailQuery.empty) {
      return NextResponse.json({ error: "Email already taken" }, { status: 400 });
    }

    // Check if username exists
    const usernameQuery = await db.collection("users").where("username", "==", username).limit(1).get();
    if (!usernameQuery.empty) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const hashed = await hashPassword(password);

    // Create user
    const docRef = await db.collection("users").add({
      email,
      username,
      password: hashed,
      is_admin: false,
      createdAt: new Date(),
    });

    const newUser = {
      id: docRef.id,
      email,
      username,
      is_admin: false,
    };

    const token = await signToken(newUser.id, newUser.email, newUser.is_admin);

    const response = NextResponse.json({
      user: { 
          id: newUser.id, 
          email: newUser.email, 
          username: newUser.username, 
          isAdmin: newUser.is_admin 
      },
    });

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
