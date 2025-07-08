// frontend/src/pages/DailyServices.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, ConciergeBell } from "lucide-react";
import * as api from "../services/api";
import { DailyService, PaginatedResponse } from "../context/models";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import { toast } from "react-hot-toast";
import PaginationControls from "../components/booking/PaginationControls";
import { usePagination } from "../hooks/usePagination";

// Form Component
const DailyServiceForm = ({
  service,
  onSave,
  onCancel,
}: {
  service?: DailyService | null;
  onSave: (
    data: Omit<
      DailyService,
      "id" | "createdAt" | "updatedAt" | "userId" | "employeeId" | "vatPaid"
    >
  ) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: service?.type || "airline-ticket",
    serviceName: service?.serviceName || "",
    originalPrice: service?.originalPrice || 0,
    totalPrice: service?.totalPrice || 0,
    date: service?.date
      ? new Date(service.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (service) {
      setFormData({
        type: service.type,
        serviceName: service.serviceName,
        originalPrice: service.originalPrice,
        totalPrice: service.totalPrice,
        date: new Date(service.date).toISOString().split("T")[0],
      });
    }
  }, [service]);

  const { commission, profit } = useMemo(() => {
    const original = Number(formData.originalPrice) || 0;
    const total = Number(formData.totalPrice) || 0;
    const comm = total - original;
    return { commission: comm, profit: comm };
  }, [formData.originalPrice, formData.totalPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.totalPrice < formData.originalPrice) {
      toast.error("Total price cannot be less than the original price.");
      return;
    }
    onSave({ ...formData, commission, profit });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("serviceType")}
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as DailyService["type"],
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="airline-ticket">{t("airline-ticket")}</option>
            <option value="hotel-reservation">{t("hotel-reservation")}</option>
            <option value="reservation-ticket">
              {t("reservation-ticket")}
            </option>
            <option value="visa">{t("visa")}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("serviceName")}
          </label>
          <input
            type="text"
            value={formData.serviceName}
            onChange={(e) =>
              setFormData({ ...formData, serviceName: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("originalPrice")}
          </label>
          <input
            type="number"
            value={formData.originalPrice}
            onChange={(e) =>
              setFormData({
                ...formData,
                originalPrice: Number(e.target.value),
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("totalPrice")}
          </label>
          <input
            type="number"
            value={formData.totalPrice}
            onChange={(e) =>
              setFormData({ ...formData, totalPrice: Number(e.target.value) })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("date")}
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
      </div>
      <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">{t("commission")}:</span>{" "}
          <span>
            {commission.toLocaleString()} {t("mad")}
          </span>
        </div>
        <div className="flex justify-between font-bold text-lg text-emerald-600">
          <span>{t("profit")}:</span>{" "}
          <span>
            {profit.toLocaleString()} {t("mad")}
          </span>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 rounded-lg"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
};

// Main Page Component
export default function DailyServices() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DailyService | null>(
    null
  );
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const servicesPerPage = 10;

  const { data: servicesResponse, isLoading } = useQuery<
    PaginatedResponse<DailyService>
  >({
    queryKey: ["dailyServices", currentPage],
    queryFn: () => api.getDailyServices(currentPage, servicesPerPage),
    placeholderData: (prev) => prev,
  });

  const services = servicesResponse?.data ?? [];
  const pagination = servicesResponse?.pagination;

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: servicesPerPage,
  });

  const { mutate: createService } = useMutation({
    mutationFn: (data: any) => api.createDailyService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyServices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["dailyServiceReport"] });
      toast.success("Service created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: updateService } = useMutation({
    mutationFn: (data: DailyService) => api.updateDailyService(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyServices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["dailyServiceReport"] });
      toast.success("Service updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteService } = useMutation({
    mutationFn: (id: number) => api.deleteDailyService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyServices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({ queryKey: ["dailyServiceReport"] });
      toast.success("Service deleted successfully!");
      setServiceToDelete(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = (data: any) => {
    if (editingService) {
      updateService({ ...editingService, ...data });
    } else {
      createService(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("dailyServicesTitle")}
          </h1>
          <p className="text-gray-600 mt-2">{t("dailyServicesSubtitle")}</p>
        </div>
        <button
          onClick={() => {
            setEditingService(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t("newService")}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {[
                "date",
                "serviceType",
                "serviceName",
                "originalPrice",
                "totalPrice",
                "commission",
                "profit",
                "actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-12">
                  <ConciergeBell className="w-12 h-12 mx-auto text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {t("noServices")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("createFirstService")}
                  </p>
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(service.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {t(service.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {service.serviceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {service.originalPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                    {service.totalPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {service.commission.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                    {service.profit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingService(service);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setServiceToDelete(service.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
              paginationRange={paginationRange}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? t("edit") : t("newService")}
      >
        <DailyServiceForm
          service={editingService}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <ConfirmationModal
        isOpen={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        onConfirm={() => deleteService(serviceToDelete!)}
        title={t("deleteServiceTitle")}
        message={t("deleteServiceMessage")}
      />
    </div>
  );
}
