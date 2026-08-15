function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function CourtPlayer({
  name,
  team,
  position,
}: {
  name: string;
  team: "a" | "b";
  position: "left" | "right";
}) {
  return (
    <div
      className={`padel-court__player padel-court__player--${team}-${position}`}>
      <span
        className={`padel-court__avatar padel-court__avatar--${team}`}
        aria-hidden="true">
        {initials(name)}
      </span>
      <span className="padel-court__name">{name}</span>
    </div>
  );
}

export default function PadelCourt({
  courtName,
  teamA,
  teamB,
  teamAScore,
  teamBScore,
  pointsTo,
  busy,
  onScoreChange,
}: {
  courtName: string;
  teamA: string[];
  teamB: string[];
  teamAScore: string;
  teamBScore: string;
  pointsTo: number;
  busy: boolean;
  onScoreChange: (side: "teamA" | "teamB", value: string) => void;
}) {
  const teamALabel = teamA.join(" & ") || "Team A";
  const teamBLabel = teamB.join(" & ") || "Team B";

  return (
    <article
      className="padel-court"
      aria-label={`${courtName}: ${teamALabel} vs ${teamBLabel}`}>
      <div className="padel-court__enclosure">
        <div className="padel-court__wall padel-court__wall--left">
          <span className="padel-court__sign">{courtName}</span>
        </div>
        <div className="padel-court__wall padel-court__wall--right" />
        <div className="padel-court__side padel-court__side--top" aria-hidden="true">
          <span className="padel-court__glass" />
          <span className="padel-court__mesh" />
          <span className="padel-court__glass" />
        </div>
        <div
          className="padel-court__side padel-court__side--bottom"
          aria-hidden="true">
          <span className="padel-court__glass" />
          <span className="padel-court__mesh" />
          <span className="padel-court__glass" />
        </div>

        <div className="padel-court__surface">
          <svg
            className="padel-court__lines"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
            aria-hidden="true">
            <rect
              x="1.2"
              y="1.2"
              width="197.6"
              height="97.6"
              fill="none"
              stroke="white"
              strokeWidth="1.4"
            />
            <line x1="30" y1="1.2" x2="30" y2="98.8" stroke="white" strokeWidth="1" />
            <line
              x1="170"
              y1="1.2"
              x2="170"
              y2="98.8"
              stroke="white"
              strokeWidth="1"
            />
            <line x1="30" y1="50" x2="100" y2="50" stroke="white" strokeWidth="1" />
            <line x1="100" y1="50" x2="170" y2="50" stroke="white" strokeWidth="1" />
          </svg>

          <div className="padel-court__net" aria-hidden="true">
            <span className="padel-court__net-post padel-court__net-post--top" />
            <span className="padel-court__net-mesh" />
            <span className="padel-court__net-post padel-court__net-post--bottom" />
          </div>

          {teamA[0] ? (
            <CourtPlayer name={teamA[0]} team="a" position="left" />
          ) : null}
          {teamA[1] ? (
            <CourtPlayer name={teamA[1]} team="a" position="right" />
          ) : null}
          {teamB[0] ? (
            <CourtPlayer name={teamB[0]} team="b" position="left" />
          ) : null}
          {teamB[1] ? (
            <CourtPlayer name={teamB[1]} team="b" position="right" />
          ) : null}

          <label className="padel-court__score padel-court__score--a">
            <input
              type="number"
              min={0}
              max={pointsTo}
              inputMode="numeric"
              value={teamAScore}
              onChange={(e) => onScoreChange("teamA", e.target.value)}
              aria-label={`Score for ${teamALabel}`}
              disabled={busy}
            />
          </label>
          <label className="padel-court__score padel-court__score--b">
            <input
              type="number"
              min={0}
              max={pointsTo}
              inputMode="numeric"
              value={teamBScore}
              onChange={(e) => onScoreChange("teamB", e.target.value)}
              aria-label={`Score for ${teamBLabel}`}
              disabled={busy}
            />
          </label>
        </div>
      </div>
    </article>
  );
}
