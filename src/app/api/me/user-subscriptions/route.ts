import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gr4-swp-be2-sp25.onrender.com';

export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.search.substring(1);
    const url = `${API_URL}/api/me/user-subscriptions${qs ? '?' + qs : ''}`;
    
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    console.error('[API] /api/me/user-subscriptions error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to fetch user subscriptions',
      },
      { status: 500 }
    );
  }
}
