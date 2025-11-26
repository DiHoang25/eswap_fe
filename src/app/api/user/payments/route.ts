import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authorization header missing" },
        { status: 401 }
      );
    }

    // Get pagination params from query string
    const { searchParams } = new URL(request.url);
    const pageNumber = searchParams.get("pageNumber") || "1";
    const pageSize = searchParams.get("pageSize") || "10";

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://gr4-swp-be2-sp25.onrender.com/api";
    const url = `${backendUrl}/payment/api/user/payments?pageNumber=${pageNumber}&pageSize=${pageSize}`;

    console.log("[User Payments] Calling backend:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "text/plain",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[User Payments] Backend error:", data);
      return NextResponse.json(
        {
          success: false,
          error: data.message || "Failed to fetch payment history",
        },
        { status: response.status }
      );
    }

    console.log("[User Payments] Success, returning data");
    return NextResponse.json({ 
      success: true, 
      data: data.data || data,
      pagination: data.pagination || null
    });
  } catch (error: any) {
    console.error("[User Payments] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
