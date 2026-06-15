import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getUser();

    if (!payload || !payload.userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Fetch user from Firestore
    const userSnap = await db.collection("users").doc(payload.userId).get();

    if (!userSnap.exists) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const userData = userSnap.data() as any;

    // FIX: Check BOTH field names
    const isAdmin = userData.is_admin === true || userData.isAdmin === true;

    return NextResponse.json({
      user: {
        id: userSnap.id,
        email: userData.email,
        username: userData.username,
        isAdmin: isAdmin, // Return the correct boolean
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
