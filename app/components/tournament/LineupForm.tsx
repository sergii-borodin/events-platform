"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type PointerEvent } from "react";
import type { EventParticipant } from "@/lib/actions/booking.actions";
import {
  buildLineupFields,
  buildLineupFieldsFromSnapshots,
  createEmptyLineupField,
  isRealLineupPlayer,
  moveLineupPlayerToCourt,
  swapLineupPlayers,
  toLineupFieldSnapshots,
  type LineupField,
  type LineupFieldSnapshotInput,
  type LineupStoredPlayer,
} from "@/lib/tournament/lineup";
import { PLAYERS_PER_COURT } from "@/lib/tournament/utils";

const TEAM_LABELS = ["Team A", "Team A", "Team B", "Team B"] as const;

export default function LineupForm({
  slug,
  participants,
  savedPlayers,
  savedFields,
  maxParticipants,
  readOnly = false,
}: {
  slug: string;
  participants: EventParticipant[];
  savedPlayers?: LineupStoredPlayer[];
  savedFields?: LineupFieldSnapshotInput[];
  maxParticipants: number;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<LineupField[]>(() =>
    savedFields?.length
      ? buildLineupFieldsFromSnapshots(
          savedFields,
          participants,
          maxParticipants,
        )
      : buildLineupFields(participants, savedPlayers, maxParticipants),
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropSlotIndex, setDropSlotIndex] = useState<number | null>(null);
  const [dropCourtIndex, setDropCourtIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dragFromIndex = useRef<number | null>(null);
  const dropSlotRef = useRef<number | null>(null);
  const dropCourtRef = useRef<number | null>(null);

  const filledCount = fields.reduce(
    (count, field) =>
      count + field.players.filter((player) => isRealLineupPlayer(player)).length,
    0,
  );
  const canAddAnotherField =
    fields.length * PLAYERS_PER_COURT < maxParticipants;

  const updateFieldName = (fieldIndex: number, fieldName: string) => {
    setFields((prev) =>
      prev.map((field, index) =>
        index === fieldIndex ? { ...field, fieldName } : field,
      ),
    );
  };

  const updatePlayer = (
    fieldIndex: number,
    playerIndex: number,
    key: "firstName" | "lastName",
    value: string,
  ) => {
    setFields((prev) =>
      prev.map((field, index) =>
        index === fieldIndex
          ? {
              ...field,
              players: field.players.map((player, slot) =>
                slot === playerIndex ? { ...player, [key]: value } : player,
              ),
            }
          : field,
      ),
    );
  };

  const clearPlayer = (fieldIndex: number, playerIndex: number) => {
    setFields((prev) =>
      prev.map((field, index) => {
        if (index !== fieldIndex) return field;
        const target = field.players[playerIndex];
        if (!target || target.bookingId) return field;
        return {
          ...field,
          players: field.players.map((player, slot) =>
            slot === playerIndex
              ? { ...player, firstName: "", lastName: "" }
              : player,
          ),
        };
      }),
    );
  };

  const addField = () => {
    if (!canAddAnotherField) return;
    setFields((prev) => [
      ...prev,
      createEmptyLineupField(`Court ${prev.length + 1}`),
    ]);
  };

  const removeField = (fieldIndex: number) => {
    setFields((prev) => {
      const target = prev[fieldIndex];
      if (!target || prev.length <= 1) return prev;
      if (target.players.some((player) => player.bookingId)) return prev;
      return prev.filter((_, index) => index !== fieldIndex);
    });
  };

  const movePlayer = (fromIndex: number, toIndex: number) => {
    setFields((prev) => swapLineupPlayers(prev, fromIndex, toIndex));
  };

  const moveToCourt = (fromIndex: number, courtIndex: number) => {
    setFields((prev) => moveLineupPlayerToCourt(prev, fromIndex, courtIndex));
  };

  const setDropTarget = (slotIndex: number | null, courtIndex: number | null) => {
    dropSlotRef.current = slotIndex;
    dropCourtRef.current = courtIndex;
    setDropSlotIndex(slotIndex);
    setDropCourtIndex(courtIndex);
  };

  const handleDragStart = (index: number) => {
    dragFromIndex.current = index;
    setDraggingIndex(index);
    setDropTarget(null, null);
  };

  const handleSlotOver = (index: number) => {
    const fromIndex = dragFromIndex.current;
    if (fromIndex === null || fromIndex === index) return;

    const fromCourt = Math.floor(fromIndex / PLAYERS_PER_COURT);
    const toCourt = Math.floor(index / PLAYERS_PER_COURT);

    if (fromCourt === toCourt) {
      dragFromIndex.current = index;
      setDraggingIndex(index);
      movePlayer(fromIndex, index);
      setDropTarget(null, toCourt);
      return;
    }

    setDropTarget(index, toCourt);
  };

  const handleCourtOver = (courtIndex: number) => {
    const fromIndex = dragFromIndex.current;
    if (fromIndex === null) return;
    if (Math.floor(fromIndex / PLAYERS_PER_COURT) === courtIndex) {
      setDropTarget(null, null);
      return;
    }
    setDropTarget(null, courtIndex);
  };

  const handleDragEnd = () => {
    const fromIndex = dragFromIndex.current;
    const toSlot = dropSlotRef.current;
    const toCourt = dropCourtRef.current;

    if (fromIndex !== null && toSlot !== null) {
      const fromCourt = Math.floor(fromIndex / PLAYERS_PER_COURT);
      const targetCourt = Math.floor(toSlot / PLAYERS_PER_COURT);
      if (fromCourt !== targetCourt) {
        movePlayer(fromIndex, toSlot);
      }
    } else if (fromIndex !== null && toCourt !== null) {
      moveToCourt(fromIndex, toCourt);
    }

    dragFromIndex.current = null;
    setDropTarget(null, null);
    setDraggingIndex(null);
  };

  const handlePointerDown = (
    index: number,
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    if (readOnly || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    handleDragStart(index);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragFromIndex.current === null) return;

    const target = document.elementFromPoint(event.clientX, event.clientY);
    const row = target?.closest("[data-lineup-index]");
    if (row instanceof HTMLElement) {
      const overIndex = Number(row.dataset.lineupIndex);
      if (Number.isInteger(overIndex)) {
        handleSlotOver(overIndex);
        return;
      }
    }

    const court = target?.closest("[data-lineup-court]");
    if (court instanceof HTMLElement) {
      const overCourt = Number(court.dataset.lineupCourt);
      if (Number.isInteger(overCourt)) {
        handleCourtOver(overCourt);
      }
    }
  };

  const handleKeyMove = (index: number, direction: -1 | 1) => {
    movePlayer(index, index + direction);
  };

  const handleKeyMoveCourt = (index: number, direction: -1 | 1) => {
    const fromCourt = Math.floor(index / PLAYERS_PER_COURT);
    const slot = index % PLAYERS_PER_COURT;
    const toCourt = fromCourt + direction;
    if (toCourt < 0 || toCourt >= fields.length) return;
    movePlayer(index, toCourt * PLAYERS_PER_COURT + slot);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/events/${slug}/tournament/lineup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: toLineupFieldSnapshots(fields) }),
          },
        );
        const result = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: { lineupFields?: LineupFieldSnapshotInput[] };
        };

        if (!response.ok || !result.success) {
          setError(result.message ?? "Could not save the lineup.");
          return;
        }

        if (result.data?.lineupFields?.length) {
          setFields(
            buildLineupFieldsFromSnapshots(
              result.data.lineupFields,
              participants,
              maxParticipants,
            ),
          );
        }

        setSuccess("Lineup saved.");
        router.refresh();
      } catch {
        setError("Could not save the lineup.");
      }
    });
  };

  return (
    <form className="tournament-panel lineup-form" onSubmit={handleSubmit}>
      <div>
        <h2>Player lineup</h2>
        <p className="tournament-panel__subtitle">
          Four players make a court. Same side are partners for a custom start.
          Drag a player onto another court to move them.
        </p>
        <p className="lineup-form__count">
          {filledCount} of {maxParticipants} players · {fields.length} court
          {fields.length === 1 ? "" : "s"}
        </p>
      </div>

      {readOnly ? (
        <p className="tournament-hint">
          This tournament already started. Reset it to change the lineup.
        </p>
      ) : null}

      <div className="lineup-fields">
        {fields.map((field, fieldIndex) => {
          const hasSignedUp = field.players.some((player) => player.bookingId);
          const canRemoveField = !readOnly && fields.length > 1 && !hasSignedUp;
          const filledOnCourt = field.players.filter((player) =>
            isRealLineupPlayer(player),
          ).length;

          return (
            <section
              key={field.key}
              data-lineup-court={fieldIndex}
              className={`lineup-court${
                dropCourtIndex === fieldIndex ? " is-drop-target" : ""
              }`}
              aria-label={`Court ${fieldIndex + 1}`}>
              <div className="lineup-court__header">
                <label className="lineup-field lineup-court__name">
                  <span>Court name</span>
                  <input
                    type="text"
                    value={field.fieldName}
                    onChange={(event) =>
                      updateFieldName(fieldIndex, event.target.value)
                    }
                    placeholder={`Court ${fieldIndex + 1}`}
                    disabled={readOnly}
                    aria-label={`Name of court ${fieldIndex + 1}`}
                  />
                </label>
                <p className="lineup-court__count">
                  {filledOnCourt}/{PLAYERS_PER_COURT}
                </p>
                {canRemoveField ? (
                  <button
                    type="button"
                    className="tournament-button tournament-button--ghost"
                    onClick={() => removeField(fieldIndex)}>
                    Remove court
                  </button>
                ) : null}
              </div>

              <div className="lineup-court__surface">
                {[0, 1].map((side) => {
                  const start = side * 2;
                  const sidePlayers = field.players.slice(start, start + 2);

                  return (
                    <div key={side} className="lineup-court__side">
                      <span className="lineup-court__side-label">
                        {side === 0 ? "Team A" : "Team B"}
                      </span>
                      <div className="lineup-court__slots">
                        {sidePlayers.map((player, sideIndex) => {
                          const playerIndex = start + sideIndex;
                          const slotIndex =
                            fieldIndex * PLAYERS_PER_COURT + playerIndex;
                          const signedUp = Boolean(player.bookingId);
                          const empty = !isRealLineupPlayer(player);
                          const playerLabel =
                            [player.firstName, player.lastName]
                              .filter(Boolean)
                              .join(" ")
                              .trim() || `player ${slotIndex + 1}`;

                          return (
                            <article
                              key={player.key}
                              data-lineup-index={slotIndex}
                              className={`lineup-slot${
                                draggingIndex === slotIndex
                                  ? " is-dragging"
                                  : ""
                              }${
                                dropSlotIndex === slotIndex
                                  ? " is-drop-target"
                                  : ""
                              }${empty ? " is-empty" : ""}`}>
                              <button
                                type="button"
                                className="lineup-slot__handle"
                                aria-label={`Drag to move ${playerLabel}`}
                                disabled={readOnly}
                                onPointerDown={(event) =>
                                  handlePointerDown(slotIndex, event)
                                }
                                onPointerMove={handlePointerMove}
                                onPointerUp={handleDragEnd}
                                onPointerCancel={handleDragEnd}
                                onKeyDown={(event) => {
                                  if (event.key === "ArrowUp") {
                                    event.preventDefault();
                                    handleKeyMove(slotIndex, -1);
                                  }
                                  if (event.key === "ArrowDown") {
                                    event.preventDefault();
                                    handleKeyMove(slotIndex, 1);
                                  }
                                  if (event.key === "ArrowLeft") {
                                    event.preventDefault();
                                    handleKeyMoveCourt(slotIndex, -1);
                                  }
                                  if (event.key === "ArrowRight") {
                                    event.preventDefault();
                                    handleKeyMoveCourt(slotIndex, 1);
                                  }
                                }}>
                                <span aria-hidden="true">⋮⋮</span>
                              </button>

                              <div className="lineup-slot__fields">
                                <label className="lineup-field">
                                  <span className="lineup-field__mobile-label">
                                    Name
                                  </span>
                                  <input
                                    type="text"
                                    value={player.firstName}
                                    onChange={(event) =>
                                      updatePlayer(
                                        fieldIndex,
                                        playerIndex,
                                        "firstName",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Name"
                                    autoComplete="given-name"
                                    disabled={readOnly}
                                    aria-label={`Name for ${TEAM_LABELS[playerIndex]} on court ${fieldIndex + 1}`}
                                  />
                                </label>

                                <label className="lineup-field">
                                  <span className="lineup-field__mobile-label">
                                    Second name
                                  </span>
                                  <input
                                    type="text"
                                    value={player.lastName}
                                    onChange={(event) =>
                                      updatePlayer(
                                        fieldIndex,
                                        playerIndex,
                                        "lastName",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Second name"
                                    autoComplete="family-name"
                                    disabled={readOnly}
                                    aria-label={`Second name for ${TEAM_LABELS[playerIndex]} on court ${fieldIndex + 1}`}
                                  />
                                </label>
                              </div>

                              {signedUp ? (
                                <span className="lineup-row__badge">
                                  Signed up
                                </span>
                              ) : readOnly ? (
                                <span className="lineup-row__badge" />
                              ) : empty ? (
                                <span className="lineup-slot__empty">
                                  Drop player
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="tournament-button tournament-button--ghost lineup-row__remove"
                                  onClick={() =>
                                    clearPlayer(fieldIndex, playerIndex)
                                  }
                                  aria-label={`Clear ${playerLabel}`}>
                                  Clear
                                </button>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="lineup-court__net" aria-hidden="true">
                  <span />
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {!readOnly && (
        <button
          type="button"
          className="tournament-button tournament-button--ghost"
          onClick={addField}
          disabled={!canAddAnotherField}>
          Add court
        </button>
      )}

      {error ? <p className="tournament-error">{error}</p> : null}
      {success ? <p className="lineup-form__success">{success}</p> : null}

      <div className="tournament-actions lineup-form__actions">
        <Link
          href={`/events/${slug}/tournament`}
          className="tournament-button tournament-button--ghost">
          Back to tournament
        </Link>
        {!readOnly && (
          <button
            type="submit"
            className="tournament-button tournament-button--primary"
            disabled={pending}>
            {pending ? "Saving…" : "Save lineup"}
          </button>
        )}
      </div>
    </form>
  );
}
