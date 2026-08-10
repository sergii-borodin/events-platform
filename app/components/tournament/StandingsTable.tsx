"use client";

import type { StandingRow } from "@/lib/tournament";

export default function StandingsTable({
  standings,
}: {
  standings: StandingRow[];
}) {
  if (standings.length === 0) {
    return <p className="tournament-empty">No standings yet.</p>;
  }

  return (
    <div className="standings-table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col">Pts</th>
            <th scope="col">Wins</th>
            <th scope="col">Played</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.playerId}>
              <td>{row.rank}</td>
              <td className="standings-table__name">{row.name}</td>
              <td>{row.points}</td>
              <td>{row.wins}</td>
              <td>{row.matchesPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
