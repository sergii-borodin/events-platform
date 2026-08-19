"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  DEFAULT_RADIUS_KM,
  eventFilterHref,
  hasLocalOrigin,
  isAutoApplyPostcode,
  isCompletePostcode,
  parseEventFilter,
  type EventFilterCategory,
} from "@/lib/utils/eventFilter";

const OPTIONS: {
  value: EventFilterCategory;
  label: string;
  description: string;
}[] = [
  { value: "all", label: "All", description: "Every event, earliest first" },
  { value: "local", label: "Local", description: "Near a postcode" },
  { value: "week", label: "This week", description: "Events this week" },
  { value: "month", label: "This month", description: "Events this month" },
];

const APPLY_DELAY_MS = 400;

function isGeolocationError(
  error: unknown,
): error is { code: number; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  );
}

function EventFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const zipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const radiusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filter = parseEventFilter({
    filter: searchParams.get("filter"),
    zip: searchParams.get("zip"),
    radius: searchParams.get("radius"),
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
  });

  const [zip, setZip] = useState(filter.zip);
  const [radius, setRadius] = useState(String(filter.radiusKm));
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");

  useEffect(() => {
    setZip(filter.zip);
    setRadius(String(filter.radiusKm));
  }, [filter.zip, filter.radiusKm]);

  useEffect(() => {
    return () => {
      if (zipTimer.current) clearTimeout(zipTimer.current);
      if (radiusTimer.current) clearTimeout(radiusTimer.current);
    };
  }, []);

  const navigate = (href: string) => {
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  const applyLocal = ({
    nextZip = zip,
    nextRadius = radius,
    lat = filter.lat,
    lng = filter.lng,
    keepOrigin = true,
  }: {
    nextZip?: string;
    nextRadius?: string;
    lat?: number | null;
    lng?: number | null;
    keepOrigin?: boolean;
  } = {}) => {
    const params = new URLSearchParams();
    params.set("filter", "local");

    const trimmedZip = nextZip.trim();
    if (trimmedZip) params.set("zip", trimmedZip);

    const radiusKm = Number(nextRadius);
    if (Number.isFinite(radiusKm) && radiusKm !== DEFAULT_RADIUS_KM) {
      params.set("radius", String(radiusKm));
    }

    if (keepOrigin && lat != null && lng != null) {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
    }

    const nextHref = `/events?${params.toString()}`;
    const currentHref = `/events${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (nextHref === currentHref) return;

    navigate(nextHref);
  };

  const applyCompleteZip = (nextZip: string, keepOrigin: boolean) => {
    if (!isCompletePostcode(nextZip)) return;
    applyLocal({ nextZip, keepOrigin });
  };

  const detectLocation = async () => {
    console.log("detectLocation");
    setDetectError("");

    if (!navigator.geolocation) {
      setDetectError("Geolocation is not supported by this browser.");
      return;
    }

    setDetecting(true);

    try {
      console.log("navigator.geolocation", navigator.geolocation);
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10_000,
          });
        },
      );

      console.log("position.coords", position.coords);
      const { latitude, longitude } = position.coords;
      const response = await fetch(
        `/api/geo/reverse?lat=${latitude}&lng=${longitude}`,
      );
      const data: { postcode?: string; message?: string } =
        await response.json();

      if (!response.ok || !data.postcode) {
        throw new Error(data.message || "Could not determine your postcode.");
      }

      console.log("data.postcode", data.postcode);
      setZip(data.postcode);
      applyLocal({
        nextZip: data.postcode,
        lat: latitude,
        lng: longitude,
      });
    } catch (error) {
      if (isGeolocationError(error)) {
        if (error.code === 1) {
          setDetectError("Location permission was denied.");
        } else {
          setDetectError(
            "Could not read your location. Try entering a postcode.",
          );
        }
      } else if (error instanceof Error) {
        setDetectError(error.message);
      } else {
        setDetectError("Could not detect your location.");
      }
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="event-filter">
      <p className="event-filter__label">Filter</p>
      <div
        className="event-filter__options"
        role="group"
        aria-label="Filter events">
        {OPTIONS.map((option) => {
          const isActive = filter.category === option.value;

          return (
            <Link
              key={option.value}
              href={eventFilterHref(option.value)}
              prefetch
              scroll={false}
              aria-current={isActive ? "true" : undefined}
              aria-label={`${option.label}: ${option.description}`}
              className={isActive ? "is-active" : undefined}>
              {option.label}
            </Link>
          );
        })}
      </div>
      {filter.category === "local" ? (
        <form
          className="event-filter-local"
          onSubmit={(event) => {
            event.preventDefault();
            if (zipTimer.current) clearTimeout(zipTimer.current);
            applyCompleteZip(zip, false);
          }}>
          <div className="event-filter-local__row">
            <div className="event-filter-local__column">
              <label htmlFor="event-filter-radius">Radius (km)</label>
              <input
                id="event-filter-radius"
                type="number"
                min={1}
                max={250}
                step={1}
                inputMode="numeric"
                value={radius}
                onChange={(event) => {
                  const nextRadius = event.target.value;
                  setRadius(nextRadius);

                  if (radiusTimer.current) clearTimeout(radiusTimer.current);
                  if (
                    !hasLocalOrigin({ zip, lat: filter.lat, lng: filter.lng })
                  ) {
                    return;
                  }

                  radiusTimer.current = setTimeout(() => {
                    applyLocal({ nextRadius });
                  }, APPLY_DELAY_MS);
                }}
              />
            </div>
            <div className="event-filter-local__column">
              <label htmlFor="event-filter-zip">Postcode</label>
              <input
                id="event-filter-zip"
                type="text"
                autoComplete="postal-code"
                inputMode="numeric"
                placeholder="e.g. 6900"
                value={zip}
                onChange={(event) => {
                  const nextZip = event.target.value;
                  setZip(nextZip);

                  if (zipTimer.current) clearTimeout(zipTimer.current);
                  if (!isAutoApplyPostcode(nextZip)) return;

                  zipTimer.current = setTimeout(() => {
                    applyCompleteZip(nextZip, false);
                  }, APPLY_DELAY_MS);
                }}
              />
            </div>
            {/* <button type="button" onClick={detectLocation} disabled={detecting}>
              <Image src="/icons/pin.svg" alt="" width={14} height={14} />
              {detecting ? "Detecting…" : "Detect my location"}
            </button> */}
          </div>
          {/* <div className="event-filter-local__row">
            <button type="submit" className="event-filter-local__apply">
              Show events
            </button>
          </div> */}
          {detectError ? (
            <p className="event-filter-local__error">{detectError}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

export function EventFilterFallback() {
  return (
    <div className="event-filter" aria-hidden="true">
      <p className="event-filter__label">Filter</p>
      <div className="event-filter__options event-filter__options--skeleton" />
    </div>
  );
}

export default EventFilter;
