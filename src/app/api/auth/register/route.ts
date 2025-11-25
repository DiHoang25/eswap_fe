import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gr4-swp-be2-sp25.onrender.com/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phoneNumber } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: 'name, email, password are required' }, { status: 400 });
    }

    // Backend RegisterRequest structure:
    // - Email: Required, EmailAddress validation
    // - Password: Required, MinLength(6)
    // - Username: Required
    // - PhoneNumber: Optional, [Phone] validation, default = string.Empty
    // Backend expects PascalCase property names
    // 
    // SOLUTION: [Phone] validation in C# FAILS with empty string ""
    // - If we send null, Backend will deserialize to default (string.Empty) but validation may skip
    // - If we don't send field, Backend uses default (string.Empty) and validation fails
    // - Best: Send null for empty phoneNumber to let Backend handle default, validation should skip
    const payload: {
      Email: string;
      Password: string;
      Username: string;
      PhoneNumber?: string | null;
    } = {
      Email: email.trim(),
      Password: password,
      Username: name.trim(),
    };

    // Only include PhoneNumber if provided and not empty
    // TEMPORARY FIX: Don't send PhoneNumber field if empty to avoid [Phone] validation error
    // NOTE: This is a workaround. Backend should fix PhoneNumber to be nullable (see REGISTER_PHONENUMBER_FIX.md)
    if (phoneNumber && phoneNumber.trim()) {
      payload.PhoneNumber = phoneNumber.trim();
    }
    // If empty, don't include PhoneNumber field at all
    // Backend will use default (string.Empty) but [Phone] validation may still fail
    // This is a temporary workaround until Backend fixes the DTO

    // Always log payload for debugging
    console.log('[Register API] Sending payload to Backend:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${API_URL}/Auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any = {};
    let rawText = '';

    try {
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        rawText = await response.text();
      }
    } catch (parseError) {
      console.error('[Register API] Failed to parse response:', parseError);
    }

    if (!response.ok) {
      // Parse error message from different possible formats
      let message = 'Đăng ký thất bại';
      
      // Check for ModelState errors (ASP.NET Core validation)
      if (data?.errors && typeof data.errors === 'object') {
        const modelStateErrors: string[] = [];
        for (const key in data.errors) {
          const fieldErrors = data.errors[key];
          if (Array.isArray(fieldErrors)) {
            modelStateErrors.push(`${key}: ${fieldErrors.join(', ')}`);
          } else {
            modelStateErrors.push(`${key}: ${fieldErrors}`);
          }
        }
        message = modelStateErrors.join('; ');
      }
      // Check for simple message
      else if (data?.message) {
        message = data.message;
      }
      // Check for error field
      else if (data?.error) {
        message = data.error;
      }
      // Check for raw text
      else if (rawText) {
        message = rawText;
      }
      
      // Special handling for specific status codes
      if (response.status === 409) {
        message = 'Email đã tồn tại, vui lòng sử dụng email khác';
      } else if (response.status === 400) {
        // Log detailed error for debugging
        console.error('[Register API] 400 Bad Request - Full Details:', {
          status: response.status,
          statusText: response.statusText,
          payload: JSON.stringify(payload, null, 2),
          responseData: JSON.stringify(data, null, 2),
          rawText,
          contentType,
        });
      }
      
      return NextResponse.json({ success: false, message }, { status: response.status });
    }


    const normalized = (data && ((data as any).data || (data as any).Data)) || data;
    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    console.error('Register proxy error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
