import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://gr4-swp-be2-sp25.onrender.com";

export async function GET(req: NextRequest) {
  try {
    const apiEndpoint = `${API_URL}/api/subscription-plans`;
    console.log('[subscription-plans] Fetching from:', apiEndpoint);
    
    // Forward Authorization header if present
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
    
    const response = await fetch(apiEndpoint, {
      method: "GET",
      headers,
      cache: "no-store", // Disable caching to always get fresh data
    });

    console.log('[subscription-plans] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[subscription-plans] Error response:', errorText);
      return NextResponse.json(
        { success: false, message: errorText || "Failed to fetch plans" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('[subscription-plans] Response data:', data);
    
    // Debug: Log sample plan to check BatteryTypeID field
    if (Array.isArray(data?.data) && data.data.length > 0) {
      console.log('[subscription-plans] Sample plan (first 3):', data.data.slice(0, 3).map((p: any) => ({
        Name: p.Name,
        PlanID: p.PlanID,
        BatteryTypeID: p.BatteryTypeID,
        BatteryModel: p.BatteryModel,
        allKeys: Object.keys(p)
      })));
    } else if (Array.isArray(data) && data.length > 0) {
      console.log('[subscription-plans] Sample plan (first 3):', data.slice(0, 3).map((p: any) => ({
        Name: p.Name,
        PlanID: p.PlanID,
        BatteryTypeID: p.BatteryTypeID,
        BatteryModel: p.BatteryModel,
        allKeys: Object.keys(p)
      })));
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
