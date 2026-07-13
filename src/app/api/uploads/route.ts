import { NextResponse } from "next/server";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ message: "No file provided." }, { status: 400 });
  }

  // If Cloudinary not configured, return a placeholder image
  if (!isCloudinaryConfigured()) {
    const name = encodeURIComponent(file.name.replace(/\.[^.]+$/, ""));
    return NextResponse.json({
      url: `https://placehold.co/400x300/FFF5EA/EF7F1A?text=${name}`,
      mock: true,
    });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: dataUri,
          api_key: CLOUDINARY_API_KEY,
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET ?? "society_food",
        }),
      },
    );

    if (!uploadRes.ok) {
      throw new Error("Cloudinary upload failed.");
    }

    const result = await uploadRes.json() as { secure_url: string };
    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
