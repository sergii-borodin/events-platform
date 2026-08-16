"use client";

import {
  FEEDBACK_TONE_OPTIONS,
  type FeedbackTone,
} from "@/lib/tournament";

export default function FeedbackTonePicker({
  tone,
  onToneChange,
  confirmRoast,
  onConfirmRoastChange,
  disabled,
}: {
  tone: FeedbackTone;
  onToneChange: (tone: FeedbackTone) => void;
  confirmRoast: boolean;
  onConfirmRoastChange: (confirmed: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="tournament-fieldset">
      <legend>Recap tone</legend>
      <div className="tournament-options tournament-options--wrap">
        {FEEDBACK_TONE_OPTIONS.map((option) => (
          <label key={option.id} className="tournament-option">
            <input
              type="radio"
              name="feedbackTone"
              value={option.id}
              checked={tone === option.id}
              disabled={disabled}
              onChange={() => {
                onToneChange(option.id);
                if (option.id !== "roast") onConfirmRoastChange(false);
              }}
            />
            <span>
              {option.label}
              <span className="tournament-option__hint">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {tone === "roast" && (
        <div className="tournament-confirm tournament-confirm--warn">
          <label className="tournament-option">
            <input
              type="checkbox"
              checked={confirmRoast}
              disabled={disabled}
              onChange={(event) => onConfirmRoastChange(event.target.checked)}
            />
            <span>Everyone here is OK with uncensored roast recaps.</span>
          </label>
          <p className="tournament-hint">
            Jokes stay about the matches. Do not use this for work events.
          </p>
        </div>
      )}
    </fieldset>
  );
}
