'use client';

import { useEffect } from 'react';
import { withAdminAuth } from '@/hoc/withAuth';
import { useAppDispatch, useAppSelector } from '@/application/hooks/useRedux';
import { fetchAllUsers } from '@/application/services/userService';
import { fetchAllStations } from '@/application/services/stationService';
import { fetchAllBatteries } from '@/application/services/batteryService';
import { fetchAllVehicles } from '@/application/services/vehicleService';
import { 
  FaUsers, 
  FaMapMarkerAlt, 
  FaBatteryFull, 
  FaCar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock
} from 'react-icons/fa';

export default withAdminAuth(function AdminDashboard() {
  const dispatch = useAppDispatch();
  
  // Get data from Redux
  const { users } = useAppSelector((state) => state.user);
  const { stations } = useAppSelector((state) => state.station);
  const { batteries } = useAppSelector((state) => state.battery);
  const { vehicles } = useAppSelector((state) => state.vehicle);

  // Fetch data on mount
  useEffect(() => {
    if (users.length === 0) {
      dispatch(fetchAllUsers({ pageNumber: 1, pageSize: 100 }));
    }
    if (stations.length === 0) {
      dispatch(fetchAllStations());
    }
    if (batteries.length === 0) {
      dispatch(fetchAllBatteries({ pageNumber: 1, pageSize: 100 }));
    }
    if (vehicles.length === 0) {
      dispatch(fetchAllVehicles());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate statistics
  const totalUsers = users.length;
  const totalStations = stations.length;
  const totalBatteries = batteries.length;
  const totalVehicles = vehicles.length;

  // User statistics by role
  const adminCount = users.filter(u => u.roleName === 'Admin').length;
  const staffCount = users.filter(u => u.roleName === 'Staff').length;
  const driverCount = users.filter(u => u.roleName === 'Driver').length;

  // Battery statistics
  const availableBatteries = batteries.filter(b => b.status === 'available').length;
  const faultyBatteries = batteries.filter(b => b.status === 'faulty').length;
  const unassignedBatteries = batteries.filter(b => !b.status || b.status === null).length;

  // Station statistics
  const activeStations = stations.filter(s => s.batteryInSlots > 0 || s.batteryOutSlots > 0).length;

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: FaUsers,
      color: 'bg-blue-500',
      details: [
        { label: 'Admins', value: adminCount },
        { label: 'Staff', value: staffCount },
        { label: 'Drivers', value: driverCount },
      ],
    },
    {
      title: 'Total Stations',
      value: totalStations,
      icon: FaMapMarkerAlt,
      color: 'bg-green-500',
      details: [
        { label: 'Active', value: activeStations },
      ],
    },
    {
      title: 'Total Batteries',
      value: totalBatteries,
      icon: FaBatteryFull,
      color: 'bg-yellow-500',
      details: [
        { label: 'Available', value: availableBatteries },
        { label: 'Faulty', value: faultyBatteries },
        { label: 'Unassigned', value: unassignedBatteries },
      ],
    },
    {
      title: 'Total Vehicles',
      value: totalVehicles,
      icon: FaCar,
      color: 'bg-purple-500',
      details: [],
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">
          Welcome to the admin dashboard. Here's an overview of your system.
        </p>
        <div className="mt-4 text-sm text-gray-500">
          Last updated: {new Date().toLocaleString('vi-VN')}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.title}</div>
                </div>
              </div>
              
              {stat.details.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  {stat.details.map((detail, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{detail.label}:</span>
                      <span className="font-semibold text-gray-900">{detail.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/user-management"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaUsers className="text-blue-500 text-2xl mb-2" />
            <div className="font-semibold text-gray-900">Manage Users</div>
            <div className="text-sm text-gray-600">View and manage all users</div>
          </a>
          <a
            href="/station-management"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaMapMarkerAlt className="text-green-500 text-2xl mb-2" />
            <div className="font-semibold text-gray-900">Manage Stations</div>
            <div className="text-sm text-gray-600">View and manage all stations</div>
          </a>
          <a
            href="/battery-management"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaBatteryFull className="text-yellow-500 text-2xl mb-2" />
            <div className="font-semibold text-gray-900">Manage Batteries</div>
            <div className="text-sm text-gray-600">View and manage all batteries</div>
          </a>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-green-500" />
              <span className="text-gray-900">System Operational</span>
            </div>
            <span className="text-sm text-gray-600">All systems running normally</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FaClock className="text-blue-500" />
              <span className="text-gray-900">Data Sync</span>
            </div>
            <span className="text-sm text-gray-600">Real-time updates enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
});
