import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authorization header missing" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing bookingId or status" },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://gr4-swp-be2-sp25.onrender.com";
    const url = `${backendUrl}/api/bookings/${bookingId}?status=${status}`;

    console.log("[Update Booking Status] Calling backend:", url);

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Update Booking Status] Backend error:", data);
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.Message || "Failed to update booking status",
        },
        { status: response.status }
      );
    }

    console.log("[Update Booking Status] Success:", data);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[Update Booking Status] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
