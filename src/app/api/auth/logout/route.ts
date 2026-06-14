import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data: existingEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1)
      .single();

    if (existingEmail) {
      return NextResponse.json({ error: "Email already taken" }, { status: 400 });
    }

    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .limit(1)
      .single();

    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const { data: user, error } = await supabase
      .from("users")
      .insert({ email, username, password: hashed, is_admin: false })
      .select()
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const token = await signToken(user.id, user.email, user.is_admin);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username, isAdmin: user.is_admin },
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
