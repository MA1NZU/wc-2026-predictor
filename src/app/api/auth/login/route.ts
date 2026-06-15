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

    // 1. Find User
    const snapshot = await db.collection("users").where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const docSnap = snapshot.docs[0];
    // FIX: Get data as 'any' to handle dynamic fields
    const user = docSnap.data() as any;

    // 2. Check Password
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 3. FIX: Check for BOTH field names to determine Admin status
    // This fixes the issue where you are Admin in DB but Regular User in App
    const isAdmin = user.is_admin === true || user.isAdmin === true;

    console.log(`>>> [LOGIN] User: ${email} | Admin Status Found: ${isAdmin} | Field in DB:`, user.is_admin !== undefined ? 'is_admin' : (user.isAdmin !== undefined ? 'isAdmin' : 'MISSING'));

    // 4. Sign Token with CORRECT admin status
    const token = await signToken(docSnap.id, user.email, isAdmin);

    const response = NextResponse.json({
      user: { id: docSnap.id, email: user.email, username: user.username, isAdmin },
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
