import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getUser();
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, email, username, is_admin")
      .eq("id", payload.userId)
      .single();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.is_admin,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
