"use client";

import { withAdminAuth } from '@/hoc/withAuth';
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaIdCard, FaUserTag } from "react-icons/fa";
import { userRepositoryAPI } from "@/infrastructure/repositories/UserRepositoryAPI.impl";
import { User } from "@/domain/entities/User";

export default withAdminAuth(function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchUserDetail = async () => {
      if (!userId) return;

      setLoading(true);
      setError("");

      try {
        const userData = await userRepositoryAPI.getById(userId);
        setUser(userData);
      } catch (err) {
        console.error("Failed to fetch user details:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [userId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 mb-4">{error || "User not found"}</p>
          <button
            onClick={() => router.push("/user-management")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to User List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push("/user-management")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to user list"
          >
            <FaArrowLeft className="text-xl text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
                <FaUser className="text-4xl text-indigo-600" />
              </div>
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {user.username}
              </h2>
              <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-4"
                style={{
                  backgroundColor: 
                    user.roleName === "Admin" ? "#fee2e2" :
                    user.roleName === "Staff" ? "#dbeafe" :
                    "#dcfce7",
                  color:
                    user.roleName === "Admin" ? "#991b1b" :
                    user.roleName === "Staff" ? "#1e40af" :
                    "#166534"
                }}
              >
                {user.roleName}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <FaEnvelope className="text-lg text-indigo-500" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <FaPhone className="text-lg text-indigo-500" />
                  <span>{user.phoneNumber || "N/A"}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <FaIdCard className="text-lg text-indigo-500" />
                  <span className="font-mono text-sm">{user.userID}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FaUserTag className="text-indigo-600" />
              Account Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">User ID</p>
                <p className="font-medium text-gray-900 font-mono text-sm break-all">
                  {user.userID}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium text-gray-900">{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-900">{user.roleName}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FaPhone className="text-indigo-600" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium text-gray-900">
                  {user.phoneNumber || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push("/user-management")}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to List
          </button>
        </div>
      </div>
    </div>
  );
});
