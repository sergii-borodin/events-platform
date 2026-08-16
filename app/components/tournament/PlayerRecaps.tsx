import {
  PLAYER_HIGHLIGHT_LABELS,
  ordinal,
  type PlayerArc,
  type PlayerRecap,
} from "@/lib/tournament";

export default function PlayerRecaps({
  arcs,
  recaps,
}: {
  arcs: PlayerArc[];
  recaps: PlayerRecap[];
}) {
  const textById = new Map(recaps.map((recap) => [recap.playerId, recap.text]));
  const ordered = [...arcs].sort((a, b) => a.finalRank - b.finalRank);

  if (ordered.length === 0) {
    return <p className="tournament-empty">No recaps yet.</p>;
  }

  return (
    <div className="tournament-recap-grid">
      {ordered.map((arc) => {
        const text = textById.get(arc.playerId);
        const rankChanged = arc.firstRank !== arc.finalRank;

        return (
          <article key={arc.playerId} className="tournament-recap-card">
            <div className="tournament-recap-card__top">
              <div>
                <h3 className="tournament-recap-card__name">{arc.name}</h3>
                <p className="tournament-recap-card__rank">
                  {ordinal(arc.finalRank)}
                  {rankChanged ? ` · started ${ordinal(arc.firstRank)}` : null}
                </p>
              </div>
              <span
                className={`tournament-recap-badge tournament-recap-badge--${arc.highlight}`}>
                {PLAYER_HIGHLIGHT_LABELS[arc.highlight]}
              </span>
            </div>
            <p className="tournament-recap-card__text">
              {text ?? "No recap for this player yet."}
            </p>
          </article>
        );
      })}
    </div>
  );
}
