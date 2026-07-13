import { NextResponse } from "next/server";
import { addDish, updateDish } from "@/lib/store-service";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const dish = await addDish(body);
    return NextResponse.json(dish, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create dish.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const body = await request.json();
  try {
    const dish = await updateDish(body.dishId, body);
    return NextResponse.json(dish, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update dish.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
