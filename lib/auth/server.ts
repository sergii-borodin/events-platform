import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { User } from "@/database";
import connectDB from "@/lib/mongodb";

const SESSION_COOKIE_NAME = "session";

export async function getCurrentUser() {
  const session = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(session, true);
    return decoded; // uid, email, etc.
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export type OrganizerDisplayName =
  | {
      ok: true;
      displayName: string;
      firebaseUid: string;
      userId: string;
    }
  | {
      ok: false;
      status: 401 | 409;
      message: string;
    };

export async function requireOrganizerDisplayName(): Promise<OrganizerDisplayName> {
  let decoded;
  try {
    decoded = await requireUser();
  } catch {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const firebaseUid = decoded.uid?.trim();
  if (!firebaseUid) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  await connectDB();

  const user = await User.findOne({ firebaseUid })
    .select("firstName lastName")
    .lean<{ _id: unknown; firstName?: string; lastName?: string } | null>();

  const firstName = user?.firstName?.trim() ?? "";
  const lastName = user?.lastName?.trim() ?? "";

  if (!user || !firstName || !lastName) {
    return { ok: false, status: 409, message: "Complete your profile" };
  }

  return {
    ok: true,
    displayName: `${firstName} ${lastName}`,
    firebaseUid,
    userId: String(user._id),
  };
}
