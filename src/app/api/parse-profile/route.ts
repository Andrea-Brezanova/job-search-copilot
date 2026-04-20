// This file exposes a basic API endpoint for parsing profile text.
import { NextResponse } from "next/server";
import { parseProfileText } from "@/lib/engines/profileEngine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { profileText?: string };

    if (!body.profileText?.trim()) {
      return NextResponse.json(
        { error: "Profile text is required." },
        { status: 400 }
      );
    }

    const parsedProfile = await parseProfileText(body.profileText);
    return NextResponse.json(parsedProfile);
  } catch (error) {
    console.error("parse-profile error", error);

    return NextResponse.json(
      { error: "Unable to parse profile text." },
      { status: 500 }
    );
  }
}
