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

    // 1. Firebase Admin Query
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Extract User
    const docSnap = snapshot.docs[0];
    const user = { id: docSnap.id, ...docSnap.data() } as any;

    // 3. Check Password
    // Ensure 'password' exists in your Firestore document
    const valid = await comparePassword(password, user.password);

    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 4. Sign Token
    const token = await signToken(user.id, user.email, user.is_admin);

    // 5. Set Cookie & Return Response
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.is_admin,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
