import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import connectDB from "@/lib/mongodb";
import { Event } from "@/database/event.model";
import { getEvents } from "@/lib/actions/event.actions";
import { requireOrganizerDisplayName } from "@/lib/auth/server";
import { parseEventFilter, toEventQuery, isCompletePostcode } from "@/lib/utils/eventFilter";
import { geocodePostcode } from "@/lib/utils/geo";

export async function POST(req: NextRequest) {
  try {
    const organizer = await requireOrganizerDisplayName();
    if (!organizer.ok) {
      return NextResponse.json(
        { message: organizer.message },
        { status: organizer.status },
      );
    }

    await connectDB();

    const formData = await req.formData();

    let event;
    let tags: string[];

    try {
      event = Object.fromEntries(formData.entries());
      tags = JSON.parse(formData.get("tags") as string);
    } catch (e) {
      return NextResponse.json(
        { message: "Invalid JSON data format" },
        { status: 400 },
      );
    }

    const file = formData.get("image") as File;

    if (!file)
      return NextResponse.json(
        { message: "Image file is required" },
        { status: 400 },
      );

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "PadelEvent",
            quality: "auto",
            fetch_format: "auto",
          },
          (error, results) => {
            if (error) return reject(error);

            resolve(results);
          },
        )
        .end(buffer);
    });

    event.image = (uploadResult as { secure_url: string }).secure_url;

    const createdEvent = await Event.create({
      ...event,
      tags: tags,
      organizer: organizer.displayName,
    });

    return NextResponse.json(
      { message: "Event created successfully", event: createdEvent },
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        message: "Event Creation Failed",
        error: e instanceof Error ? e.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const query = toEventQuery(
      parseEventFilter({
        filter: searchParams.get("filter"),
        zip: searchParams.get("zip"),
        radius: searchParams.get("radius"),
        lat: searchParams.get("lat"),
        lng: searchParams.get("lng"),
      }),
    );

    if (
      query.category === "local" &&
      (query.lat == null || query.lng == null) &&
      isCompletePostcode(query.zip)
    ) {
      const origin = await geocodePostcode(query.zip);
      if (origin) {
        query.lat = origin.lat;
        query.lng = origin.lng;
      }
    }

    const events = await getEvents(query);

    return NextResponse.json(
      { message: "Events fetched successfully", events },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { message: "Event fetching failed", error: e },
      { status: 500 },
    );
  }
}
