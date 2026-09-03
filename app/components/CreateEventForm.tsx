"use client";

import React, { useCallback, useRef, useState } from "react";

/* =========================
   Types
========================= */

interface EventFormData {
  title: string;
  description: string;
  overview: string;
  image: File | null;
  venue: string;
  location: string;
  date: string;
  time: string;
  venueType: "inside" | "outside";
  minRating: number;
  maxRating: number;
  maxParticipants: number | "";
  duration: number | "";
  organizer: string;
  tags: string[];
}

type FormErrors = Partial<Record<keyof EventFormData | "rating", string>>;

/* =========================
   Constants
========================= */

const MIN_RATINGS = [0, 1, 2, 3, 4] as const;
const MAX_RATINGS = [1, 2, 3, 4, 5] as const;

const INITIAL_FORM: EventFormData = {
  title: "",
  description: "",
  overview: "",
  image: null,
  venue: "",
  location: "",
  date: "",
  time: "",
  venueType: "inside",
  minRating: 0,
  maxRating: 5,
  maxParticipants: "",
  duration: "",
  organizer: "",
  tags: [],
};

/* =========================
   Validation
========================= */

function validate(form: EventFormData): FormErrors {
  const errors: FormErrors = {};

  if (!form.title.trim()) errors.title = "Title is required.";
  if (!form.description.trim()) errors.description = "Description is required.";
  if (!form.overview.trim()) errors.overview = "Overview is required.";
  if (!form.image) errors.image = "Image is required.";
  if (!form.venue.trim()) errors.venue = "Venue is required.";
  if (!form.location.trim()) errors.location = "Location is required.";
  if (!form.date) errors.date = "Date is required.";
  if (!form.time) errors.time = "Time is required.";
  if (!form.organizer.trim()) errors.organizer = "Organizer is required.";
  if (form.tags.length === 0) errors.tags = "At least one tag is required.";

  if (form.duration === "" || Number(form.duration) < 60) {
    errors.duration = "Duration must be at least 60 minutes.";
  }
  if (form.maxParticipants === "" || Number(form.maxParticipants) < 1) {
    errors.maxParticipants = "At least 1 participant is required.";
  }
  if (form.minRating > form.maxRating) {
    errors.rating = "Min rating cannot exceed max rating.";
  }

  return errors;
}

/* =========================
   Sub-components
========================= */

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

interface RatingTrackProps {
  values: readonly number[];
  selected: number;
  onChange: (v: number) => void;
  label: string;
}

function RatingTrack({ values, selected, onChange, label }: RatingTrackProps) {
  return (
    <div className="rating-track" role="group" aria-label={label}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          className={`rating-dot${v === selected ? " active" : ""}`}
          aria-label={`Rating ${v}`}
          onClick={() => onChange(v)}>
          {v}
        </button>
      ))}
    </div>
  );
}

/* =========================
   Main component
========================= */

interface CreateEventFormProps {
  /**
   * Called with the validated form payload when the user submits.
   * The `image` field is the raw File — upload it to your storage
   * provider (S3, Cloudinary, etc.) and substitute the returned URL
   * before POSTing to your API route.
   */
  onSubmit: (data: EventFormData) => void | Promise<void>;
  organizerName: string;
}

export default function CreateEventForm({
  onSubmit,
  organizerName,
}: CreateEventFormProps) {
  const [form, setForm] = useState<EventFormData>(() => ({
    ...INITIAL_FORM,
    organizer: organizerName,
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [tagInput, setTagInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Field helpers ---- */

  function set<K extends keyof EventFormData>(key: K, value: EventFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  /* ---- Image ---- */

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      set("image", file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function removeImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    set("image", null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ---- Tags ---- */

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!value || form.tags.includes(value)) return;
    set("tags", [...form.tags, value]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    set(
      "tags",
      form.tags.filter((t) => t !== tag),
    );
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  }

  /* ---- Rating ---- */

  function setMinRating(v: number) {
    setForm((prev) => ({ ...prev, minRating: v }));
    if (errors.rating) setErrors((prev) => ({ ...prev, rating: undefined }));
  }

  function setMaxRating(v: number) {
    setForm((prev) => ({ ...prev, maxRating: v }));
    if (errors.rating) setErrors((prev) => ({ ...prev, rating: undefined }));
  }

  /* ---- Submit ---- */

  async function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- Reset ---- */

  function handleReset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setForm({ ...INITIAL_FORM, organizer: organizerName });
    setErrors({});
    setTagInput("");
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ---- Render ---- */

  return (
    <>
      <style>{`
        .ef-root { font-family: var(--font-sans, system-ui, sans-serif); color: var(--color-text-primary, #111); }
        .ef-section { margin-bottom: 2rem; }
        .ef-section-label { font-size: 11px; font-weight: 500; letter-spacing: 0.07em; text-transform: uppercase; color: var(--color-text-tertiary, #999); margin-bottom: 1rem; padding-bottom: 6px; border-bottom: 0.5px solid var(--color-border-tertiary, #e0e0e0); }
        .ef-root .field { margin-bottom: 1.25rem; }
        .ef-root .field label { display: block; font-size: 13px; color: var(--color-text-secondary, #555); margin-bottom: 5px; }
        .ef-root .field .req { color: #d9534f; }
        .ef-root .field input[type="text"],
        .ef-root .field input[type="date"],
        .ef-root .field input[type="time"],
        .ef-root .field input[type="number"],
        .ef-root .field select,
        .ef-root .field textarea { width: 100%; box-sizing: border-box; border: 0.5px solid var(--color-border-secondary, #ccc); border-radius: 8px; padding: 8px 10px; font-size: 14px; background: var(--color-background-primary, #fff); color: var(--color-text-primary, #111); }
        .ef-root .field textarea { resize: vertical; min-height: 72px; }
        .ef-root .field input:focus,
        .ef-root .field select:focus,
        .ef-root .field textarea:focus { outline: none; border-color: var(--color-border-info, #4a90e2); box-shadow: 0 0 0 2px rgba(74,144,226,0.15); }
        .ef-root .hint { font-size: 12px; color: var(--color-text-tertiary, #999); margin: 4px 0 0; }
        .ef-root .error { font-size: 12px; color: #d9534f; margin: 4px 0 0; }
        .ef-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ef-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        .drop-zone { border: 1.5px dashed var(--color-border-secondary, #ccc); border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; background: var(--color-background-secondary, #f9f9f9); transition: background 0.15s; }
        .drop-zone.drag-over, .drop-zone:hover { background: var(--color-background-info, #e8f0fe); border-color: var(--color-border-info, #4a90e2); }
        .drop-zone p { font-size: 13px; color: var(--color-text-secondary, #555); margin: 6px 0 0; }
        .drop-zone p.sub { font-size: 11px; color: var(--color-text-tertiary, #999); }
        .drop-zone strong { color: var(--color-text-primary, #111); font-weight: 500; }
        .img-preview { position: relative; margin-top: 10px; }
        .img-preview img { width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; display: block; }
        .img-remove { position: absolute; top: 6px; right: 6px; background: var(--color-background-primary, #fff); border: 0.5px solid var(--color-border-secondary, #ccc); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; line-height: 1; }
        .img-remove:hover { background: #fdecea; }
        .img-name { font-size: 12px; color: var(--color-text-tertiary, #999); margin: 6px 0 0; }

        .venue-toggle { display: flex; border: 0.5px solid var(--color-border-secondary, #ccc); border-radius: 8px; overflow: hidden; }
        .venue-toggle label { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 12px; font-size: 13px; cursor: pointer; color: var(--color-text-secondary, #555); border-right: 0.5px solid var(--color-border-tertiary, #e0e0e0); }
        .venue-toggle label:last-child { border-right: none; }
        .venue-toggle input { display: none; }
        .venue-toggle label.selected { background: var(--color-background-secondary, #f0f0f0); color: var(--color-text-primary, #111); font-weight: 500; }

        .rating-track { display: flex; gap: 6px; margin-top: 6px; }
        .rating-dot { width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--color-border-secondary, #ccc); background: var(--color-background-secondary, #f0f0f0); color: var(--color-text-secondary, #555); font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.1s; }
        .rating-dot.active { background: var(--color-background-info, #e8f0fe); border-color: var(--color-border-info, #4a90e2); color: var(--color-text-info, #1a56c4); }
        .rating-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .tag-row { display: flex; gap: 8px; }
        .tag-row input { flex: 1; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .tag-pill { display: inline-flex; align-items: center; gap: 5px; background: var(--color-background-secondary, #f0f0f0); border: 0.5px solid var(--color-border-secondary, #ccc); border-radius: 20px; padding: 3px 10px; font-size: 13px; color: var(--color-text-secondary, #555); }
        .tag-pill button { background: none; border: none; cursor: pointer; padding: 0; color: var(--color-text-tertiary, #999); font-size: 16px; line-height: 1; display: flex; align-items: center; }
        .tag-pill button:hover { color: #d9534f; }

        .form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 1rem; border-top: 0.5px solid var(--color-border-tertiary, #e0e0e0); }
        .btn { padding: 9px 18px; font-size: 14px; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .btn-secondary { background: transparent; border: 0.5px solid var(--color-border-secondary, #ccc); color: var(--color-text-secondary, #555); }
        .btn-secondary:hover { background: var(--color-background-secondary, #f0f0f0); }
        .btn-primary { background: var(--color-background-info, #e8f0fe); border: 0.5px solid var(--color-border-info, #4a90e2); color: var(--color-text-info, #1a56c4); }
        .btn-primary:hover:not(:disabled) { filter: brightness(0.95); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-add { padding: 0 14px; height: 36px; font-size: 13px; white-space: nowrap; }

        @media (max-width: 639px) {
          .ef-row-2, .ef-row-3, .rating-grid { grid-template-columns: 1fr; }
          .form-actions { flex-direction: column-reverse; }
          .form-actions .btn { width: 100%; }
          .tag-row { flex-direction: column; }
          .btn-add { height: 40px; width: 100%; }
        }
      `}</style>

      <div className="ef-root">
        {/* Event details */}
        <section className="ef-section">
          <p className="ef-section-label">Event details</p>

          <Field label="Title" required error={errors.title}>
            <input
              type="text"
              value={form.title}
              placeholder="e.g. Spring Padel Masters"
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>

          <Field label="Description" required error={errors.description}>
            <textarea
              value={form.description}
              rows={2}
              placeholder="Short competitive summary shown in listings…"
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>

          <Field label="Overview" required error={errors.overview}>
            <textarea
              value={form.overview}
              rows={3}
              placeholder="Format details — group stage, playoffs, prizes…"
              onChange={(e) => set("overview", e.target.value)}
            />
          </Field>
        </section>

        {/* Cover image */}
        <section className="ef-section">
          <p className="ef-section-label">Cover image</p>

          <Field label="Image" required error={errors.image}>
            {!previewUrl ? (
              <div
                className={`drop-zone${isDragOver ? " drag-over" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload event image"
                onKeyDown={(e) =>
                  e.key === "Enter" && fileInputRef.current?.click()
                }>
                <p>
                  <strong>Drag & drop</strong> an image here, or{" "}
                  <strong>click to browse</strong>
                </p>
                <p className="sub">
                  PNG, JPG or WebP — recommended 1200 × 630 px
                </p>
              </div>
            ) : (
              <div className="img-preview">
                <img src={previewUrl} alt="Event cover preview" />
                <button
                  type="button"
                  className="img-remove"
                  onClick={removeImage}
                  aria-label="Remove image">
                  ×
                </button>
                <p className="img-name">
                  {form.image?.name} (
                  {((form.image?.size ?? 0) / 1024).toFixed(0)} KB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </Field>
        </section>

        {/* Venue & location */}
        <section className="ef-section">
          <p className="ef-section-label">Venue & location</p>

          <div className="ef-row-2">
            <Field label="Venue name" required error={errors.venue}>
              <input
                type="text"
                value={form.venue}
                placeholder="e.g. Barcelona Elite Club"
                onChange={(e) => set("venue", e.target.value)}
              />
            </Field>

            <Field label="Location" required error={errors.location}>
              <input
                type="text"
                value={form.location}
                placeholder="e.g. Barcelona, Spain"
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Venue type" required>
            <div className="venue-toggle" role="group" aria-label="Venue type">
              {(["inside", "outside"] as const).map((v) => (
                <label
                  key={v}
                  className={form.venueType === v ? "selected" : ""}>
                  <input
                    type="radio"
                    name="venueType"
                    value={v}
                    checked={form.venueType === v}
                    onChange={() => set("venueType", v)}
                  />
                  {v === "inside" ? "🏢 Indoor" : "🌳 Outdoor"}
                </label>
              ))}
            </div>
          </Field>
        </section>

        {/* Date & time */}
        <section className="ef-section">
          <p className="ef-section-label">Date & time</p>

          <div className="ef-row-3">
            <Field label="Date" required error={errors.date}>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>

            <Field label="Start time" required error={errors.time}>
              <input
                type="time"
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
              />
            </Field>

            <Field
              label="Duration (min)"
              required
              error={errors.duration}
              hint="Minimum 60 minutes">
              <input
                type="number"
                value={form.duration}
                min={60}
                step={30}
                placeholder="e.g. 180"
                onChange={(e) =>
                  set(
                    "duration",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </Field>
          </div>
        </section>

        {/* Participants & rating */}
        <section className="ef-section">
          <p className="ef-section-label">Participants & rating</p>

          <div className="ef-row-2">
            <Field
              label="Max participants"
              required
              error={errors.maxParticipants}>
              <input
                type="number"
                value={form.maxParticipants}
                min={1}
                step={1}
                placeholder="e.g. 32"
                onChange={(e) =>
                  set(
                    "maxParticipants",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </Field>

            <Field label="Organizer" required error={errors.organizer}>
              <input
                type="text"
                value={form.organizer}
                placeholder="e.g. Padel League BCN"
                onChange={(e) => set("organizer", e.target.value)}
              />
            </Field>
          </div>

          <div className="rating-grid">
            <Field label={`Min rating — ${form.minRating}`} required>
              <RatingTrack
                values={MIN_RATINGS}
                selected={form.minRating}
                onChange={setMinRating}
                label="Minimum rating"
              />
              <p className="hint">0 – 4</p>
            </Field>

            <Field label={`Max rating — ${form.maxRating}`} required>
              <RatingTrack
                values={MAX_RATINGS}
                selected={form.maxRating}
                onChange={setMaxRating}
                label="Maximum rating"
              />
              <p className="hint">1 – 5</p>
            </Field>
          </div>

          {errors.rating && <p className="error">{errors.rating}</p>}
        </section>

        {/* Tags */}
        <section className="ef-section">
          <p className="ef-section-label">Tags</p>

          <Field label="Add tags" required error={errors.tags}>
            <div className="tag-row">
              <input
                type="text"
                value={tagInput}
                placeholder="e.g. weekend  (press Enter or , to add)"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <button
                type="button"
                className="btn btn-secondary btn-add"
                onClick={() => addTag(tagInput)}>
                + Add
              </button>
            </div>

            {form.tags.length > 0 && (
              <div className="tag-list" aria-label="Tags">
                {form.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </section>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}>
            Clear form
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}>
            {submitting ? "Saving…" : "Create event"}
          </button>
        </div>
      </div>
    </>
  );
}
