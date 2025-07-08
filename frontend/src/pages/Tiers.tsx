// frontend/src/pages/Tiers.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { Tier, TierLimits } from "../context/models";

const TierForm = ({
  tier,
  tiers, // Receive the list of all tiers
  onSave,
  onCancel,
}: {
  tier?: Tier | null;
  tiers: Tier[]; // Add prop for all tiers
  onSave: (data: Partial<Tier>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState<Partial<Tier>>({
    name: tier?.name || "",
    limits: tier?.limits || {
      bookingsPerMonth: 0,
      programsPerMonth: 0,
      programPricingsPerMonth: 0,
      employees: 0,
      invoicing: false,
      facturesPerMonth: 0,
      dailyServicesPerMonth: 0,
      dailyServices: false,
    },
  });

  useEffect(() => {
    setFormData({
      name: tier?.name || "",
      limits: tier?.limits || {
        bookingsPerMonth: 0,
        programsPerMonth: 0,
        programPricingsPerMonth: 0,
        employees: 0,
        invoicing: false,
        facturesPerMonth: 0,
        dailyServicesPerMonth: 0,
        dailyServices: false,
      },
    });
  }, [tier]);

  const handleLimitChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === "number") {
      processedValue = value === "" ? 0 : Number(value);
    } else if (name === "invoicing" || name === "dailyServices") {
      processedValue = value === "true";
    }

    setFormData((prev) => ({
      ...prev,
      limits: { ...(prev.limits as TierLimits), [name]: processedValue },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name?.trim();
    if (!trimmedName) {
      toast.error("Tier name is required.");
      return;
    }

    // Frontend validation to check for duplicate names before sending to backend
    const isNameDuplicate = tiers.some(
      (existingTier) =>
        existingTier.name.toLowerCase() === trimmedName.toLowerCase() &&
        existingTier.id !== tier?.id // Exclude the current tier when editing
    );

    if (isNameDuplicate) {
      toast.error(`A tier with the name "${trimmedName}" already exists.`);
      return;
    }

    onSave({ ...formData, name: trimmedName });
  };

  const limitFields: (keyof Omit<TierLimits, "invoicing" | "dailyServices">)[] =
    [
      "bookingsPerMonth",
      "programsPerMonth",
      "programPricingsPerMonth",
      "employees",
      "facturesPerMonth",
      "dailyServicesPerMonth",
    ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Tier Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          required
        />
      </div>
      <p className="text-sm text-gray-500">
        Set the limits for this tier. Use -1 for unlimited.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {limitFields.map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 capitalize">
              {field.replace(/([A-Z])/g, " $1").trim()}
            </label>
            <input
              type="number"
              name={field}
              value={(formData.limits as TierLimits)?.[field] ?? 0}
              onChange={handleLimitChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Invoicing Access
          </label>
          <select
            name="invoicing"
            value={String((formData.limits as TierLimits)?.invoicing ?? false)}
            onChange={handleLimitChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Daily Services Access
          </label>
          <select
            name="dailyServices"
            value={String(
              (formData.limits as TierLimits)?.dailyServices ?? false
            )}
            onChange={handleLimitChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Save Tier
        </button>
      </div>
    </form>
  );
};

export default function TiersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<number | null>(null);

  const { data: tiers = [], isLoading } = useQuery<Tier[]>({
    queryKey: ["tiers"],
    queryFn: api.getTiers,
  });

  const { mutate: createTier } = useMutation({
    mutationFn: (data: Partial<Tier>) => api.createTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast.success("Tier created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create tier.");
    },
  });

  const { mutate: updateTier } = useMutation({
    mutationFn: (data: Tier) => api.updateTier(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast.success("Tier updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteTier } = useMutation({
    mutationFn: (id: number) => api.deleteTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast.success("Tier deleted successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = (data: Partial<Tier>) => {
    if (editingTier) {
      updateTier({ ...editingTier, ...data });
    } else {
      createTier(data);
    }
  };

  const openAddModal = () => {
    setEditingTier(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tier: Tier) => {
    setEditingTier(tier);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setTierToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (tierToDelete) {
      deleteTier(tierToDelete);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Tiers</h1>
          <p className="text-gray-600 mt-2">
            Create, update, and delete subscription tiers.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Tier
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Limits
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : (
              tiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {tier.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <span>Bookings/mo: {tier.limits.bookingsPerMonth}</span>
                      <span>Programs/mo: {tier.limits.programsPerMonth}</span>
                      <span>Employees: {tier.limits.employees}</span>
                      <span>
                        Invoicing: {tier.limits.invoicing ? "Yes" : "No"}
                      </span>
                      <span>
                        Daily Services/mo: {tier.limits.dailyServicesPerMonth}
                      </span>
                      <span>
                        Daily Services:{" "}
                        {tier.limits.dailyServices ? "Yes" : "No"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(tier)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {tier.id > 3 && ( // Prevent deleting default tiers
                        <button
                          onClick={() => handleDelete(tier.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTier ? "Edit Tier" : "Add New Tier"}
        size="lg"
      >
        <TierForm
          tier={editingTier}
          tiers={tiers}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Tier"
        message="Are you sure you want to delete this tier? This action cannot be undone."
      />
    </div>
  );
}
