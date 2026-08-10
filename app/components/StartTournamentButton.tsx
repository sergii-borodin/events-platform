"use client";

import Link from "next/link";

export default function StartTournamentButton({
  slug,
  status,
}: {
  slug: string;
  status: "setup" | "playing" | "finished" | null;
}) {
  const label =
    status === "playing" || status === "finished"
      ? "Resume tournament"
      : "Start tournament";

  return (
    <Link
      href={`/events/${slug}/tournament`}
      className="button-start-tournament">
      {label}
    </Link>
  );
}
