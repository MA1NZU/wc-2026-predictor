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

    const doc = await db.collection("users").doc(payload.userId).get();
    if (!doc.exists) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const data = doc.data()!;
    const user = {
      id: doc.id,
      email: data.email,
      username: data.username,
      isAdmin: data.isAdmin || false,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
