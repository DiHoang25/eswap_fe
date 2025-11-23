"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/application/hooks/useRedux";
import { createVehicle } from "@/application/services/vehicleService";
import { fetchAllBatteryTypes } from "@/application/services/batteryTypeService";
import { CreateVehicleInput } from "@/domain/repositories/VehicleRepository";
import { Modal } from "@/presentation/components/ui/Modal";

interface CreateVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateVehicleModal: React.FC<CreateVehicleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.vehicle);
  const { batteryTypes } = useAppSelector((state) => state.batteryType);

  const [formData, setFormData] = useState<CreateVehicleInput>({
    vehicleName: "",
    category: "ElectricMotorbike",
    vin: "",
    licensePlate: "",
    modelYear: "",
    color: "",
    batteryType: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && batteryTypes.length === 0) {
      dispatch(fetchAllBatteryTypes());
    }
  }, [isOpen, dispatch, batteryTypes.length]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicleName.trim()) {
      newErrors.vehicleName = "Tên xe là bắt buộc";
    }

    if (!formData.category) {
      newErrors.category = "Loại xe là bắt buộc";
    }

    if (!formData.batteryType) {
      newErrors.batteryType = "Loại pin là bắt buộc";
    }

    if (formData.modelYear) {
      if (!/^\d{4}$/.test(formData.modelYear)) {
        newErrors.modelYear = "Năm sản xuất phải là 4 chữ số";
      } else {
        const currentYear = new Date().getFullYear();
        const year = parseInt(formData.modelYear, 10);
        if (year > currentYear) {
          newErrors.modelYear = `Năm sản xuất không được vượt quá năm hiện tại (${currentYear})`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      // Map form data to API format
      const createData: CreateVehicleInput = {
        vehicleName: formData.vehicleName.trim(),
        category: formData.category,
        vin: formData.vin?.trim() || undefined,
        licensePlate: formData.licensePlate?.trim() || undefined,
        modelYear: formData.modelYear?.trim() || undefined,
        color: formData.color?.trim() || undefined,
        batteryType: formData.batteryType || undefined,
      };

      await dispatch(createVehicle(createData)).unwrap();
      onSuccess();
      // Reset form
      setFormData({
        vehicleName: "",
        category: "ElectricMotorbike",
        vin: "",
        licensePlate: "",
        modelYear: "",
        color: "",
        batteryType: "",
      });
      setErrors({});
    } catch (error: any) {
      console.error("Failed to create vehicle:", error);
      setErrors({
        submit: error.message || "Có lỗi xảy ra khi tạo xe. Vui lòng thử lại.",
      });
    }
  };

  const handleChange = (
    field: keyof CreateVehicleInput,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={true}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold bg-linear-to-br from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Thêm xe mới
          </h2>
          <p className="text-gray-600 mt-1">
            Nhập thông tin xe của bạn để bắt đầu sử dụng dịch vụ
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehicle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên xe <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vehicleName}
              onChange={(e) => handleChange("vehicleName", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.vehicleName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ví dụ: Xe máy điện của tôi"
              disabled={loading}
            />
            {errors.vehicleName && (
              <p className="text-red-500 text-sm mt-1">{errors.vehicleName}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại xe <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.category ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="ElectricMotorbike">Xe máy điện</option>
              <option value="SmallElectricCar">Ô tô điện cỡ nhỏ</option>
              <option value="ElectricSUV">Ô tô điện SUV</option>
            </select>
            {errors.category && (
              <p className="text-red-500 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* License Plate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Biển số xe
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) => handleChange("licensePlate", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ví dụ: 30A-12345"
              disabled={loading}
            />
          </div>

          {/* VIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số khung (VIN)
            </label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => handleChange("vin", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nhập số khung xe"
              disabled={loading}
            />
          </div>

          {/* Model Year and Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Năm sản xuất
              </label>
              <input
                type="text"
                value={formData.modelYear}
                onChange={(e) => {
                  // Chỉ cho phép nhập số
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 4) {
                    handleChange("modelYear", value);
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.modelYear ? "border-red-500" : "border-gray-300"
                }`}
                placeholder={new Date().getFullYear().toString()}
                maxLength={4}
                disabled={loading}
              />
              {errors.modelYear && (
                <p className="text-red-500 text-sm mt-1">{errors.modelYear}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Màu sắc
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange("color", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ví dụ: Đỏ, Xanh, Đen"
                disabled={loading}
              />
            </div>
          </div>

          {/* Battery Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại pin <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.batteryType}
              onChange={(e) => handleChange("batteryType", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.batteryType ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading || batteryTypes.length === 0}
            >
              <option value="">Chọn loại pin</option>
              {batteryTypes.map((bt) => (
                <option key={bt.batteryTypeID} value={bt.batteryTypeModel}>
                  {bt.batteryTypeModel} ({bt.batteryTypeCapacity}kWh)
                </option>
              ))}
            </select>
            {errors.batteryType && (
              <p className="text-red-500 text-sm mt-1">{errors.batteryType}</p>
            )}
            {batteryTypes.length === 0 && !errors.batteryType && (
              <p className="text-gray-500 text-sm mt-1">
                Đang tải danh sách loại pin...
              </p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors duration-200 font-medium disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Đang tạo...
                </span>
              ) : (
                "Tạo xe"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateVehicleModal;

