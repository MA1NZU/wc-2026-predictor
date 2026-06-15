import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getUser();

    if (!payload || !payload.userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Firebase Admin: Fetch user document directly by ID
    const userRef = db.collection("users").doc(payload.userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = { id: userSnap.id, ...userSnap.data() } as any;

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
