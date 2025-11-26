/**
 * Session Cookie Service
 * Clean Architecture - Infrastructure Layer
 */

import { UserRole } from "@/domain/entities/Auth";

interface SetSessionParams {
  token: string;
  role: UserRole;
  refreshToken?: string;
  maxAge?: number;
}

class SessionCookieService {
  /**
   * Set server-side session cookies
   */
  async setSession(params: SetSessionParams): Promise<boolean> {
    try {
      // Use the correct endpoint and format
      const response = await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: params.token, // Map token to accessToken
          refreshToken: params.refreshToken, // Optional refresh token
          role: params.role,
          // Note: maxAge is not used by the endpoint, it uses fixed values
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = errorText || `HTTP ${response.status}`;
        console.error("Failed to set session cookies:", errorMessage);
        return false;
      }

      const result = await response.json();
      if (!result.success) {
        console.error("Session cookie API returned failure:", result.message || result);
        return false;
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Setting server session failed:", errorMessage);
      return false;
    }
  }

  /**
   * Clear server-side session cookies
   */
  async clearSession(): Promise<void> {
    try {
      await fetch("/api/auth/logout-local", {
        method: "POST",
      });
    } catch (error) {
      console.warn("Clearing server session failed (non-fatal):", error);
    }
  }
}

export const sessionCookie = new SessionCookieService();
