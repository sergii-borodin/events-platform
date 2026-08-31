import { NextRequest, NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/firebase/admin";
import { upsertUserFromFirebase } from "@/lib/actions/user.actions";

const SESSION_COOKIE_NAME = "session";
const EXPIRES_IN = 60 * 60 * 24 * 5 * 1000; // 5 days

function optionalName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  const { idToken, firstName, lastName } = body as Record<string, unknown>;

  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  const adminAuth = getAdminAuth();

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("session id token verification failed", error);
    return NextResponse.json({ status: "error" }, { status: 401 });
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: EXPIRES_IN,
  });

  try {
    const result = await upsertUserFromFirebase({
      firebaseUid: decoded.uid,
      email: decoded.email ?? "",
      firstName: optionalName(firstName),
      lastName: optionalName(lastName),
    });

    if (result.status === "error") {
      console.error("upsert user during session returned error", {
        uid: decoded.uid,
      });
    }
  } catch (error) {
    console.error("upsert user during session failed", error);
  }

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: EXPIRES_IN / 1000,
    path: "/",
    sameSite: "lax",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ status: "ok" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
