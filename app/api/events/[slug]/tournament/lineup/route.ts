import { NextResponse } from "next/server";
import { saveTournamentLineup } from "@/lib/actions/tournament.actions";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = (await request.json()) as {
      fields?: unknown;
    };

    if (!Array.isArray(body.fields)) {
      return NextResponse.json(
        { success: false, message: "Lineup is required." },
        { status: 400 },
      );
    }

    const result = await saveTournamentLineup({
      slug,
      fields: body.fields,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message ?? "Could not save the lineup." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("POST lineup failed", error);
    return NextResponse.json(
      { success: false, message: "Could not save the lineup." },
      { status: 500 },
    );
  }
}
