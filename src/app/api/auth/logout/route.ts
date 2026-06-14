import { NextResponse } from "next/server";
import { removeToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await removeToken();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
