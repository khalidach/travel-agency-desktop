// frontend/src/pages/Owner.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, SlidersHorizontal } from "lucide-react";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { User, Tier, TierLimits } from "../context/models";
import LimitsModal from "../components/owner/LimitsModal";

const AdminForm = ({
  user,
  tiers,
  onSave,
  onCancel,
}: {
  user?: User | null;
  tiers: Tier[];
  onSave: (data: Partial<User>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    username: user?.username || "",
    password: "",
    agencyName: user?.agencyName || "",
    tierId: user?.tierId || (tiers.length > 0 ? tiers[0].id : 1),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.username ||
      !formData.agencyName ||
      (!user && !formData.password)
    ) {
      toast.error("Username, Agency Name, and Password are required.");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password {user ? "(leave blank to keep unchanged)" : ""}
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Agency Name
        </label>
        <input
          type="text"
          value={formData.agencyName}
          onChange={(e) =>
            setFormData({ ...formData, agencyName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          required
        />
      </div>
      {!user && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tier
          </label>
          <select
            value={formData.tierId}
            onChange={(e) =>
              setFormData({ ...formData, tierId: Number(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          >
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
        </div>
      )}
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
          Save Admin
        </button>
      </div>
    </form>
  );
};

export default function OwnerPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [userForLimits, setUserForLimits] = useState<User | null>(null);

  const { data: adminUsers = [], isLoading: isLoadingAdmins } = useQuery<
    User[]
  >({
    queryKey: ["adminUsers"],
    queryFn: api.getAdminUsers,
  });

  const { data: tiers = [], isLoading: isLoadingTiers } = useQuery<Tier[]>({
    queryKey: ["tiers"],
    queryFn: api.getTiers,
  });

  const { mutate: createUser } = useMutation({
    mutationFn: (data: Partial<User>) => api.createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Admin user created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create admin user.");
    },
  });

  const { mutate: updateUser } = useMutation({
    mutationFn: (data: Partial<User>) =>
      api.updateAdminUser(editingUser!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Admin user updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteUser } = useMutation({
    mutationFn: (id: number) => api.deleteAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Admin user deleted successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (data: { id: number; activeUser: boolean }) =>
      api.toggleAdminUserStatus(data.id, data.activeUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User status updated successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: updateUserTier } = useMutation({
    mutationFn: (data: { id: number; tierId: number }) =>
      api.updateAdminUserTier(data.id, data.tierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User tier updated successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: updateUserLimits } = useMutation({
    mutationFn: (data: { id: number; limits: Partial<TierLimits> }) =>
      api.updateAdminUserLimits(data.id, data.limits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User limits updated successfully!");
      setIsLimitsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleToggleStatus = (user: User) => {
    toggleStatus({ id: user.id, activeUser: !user.activeUser });
  };

  const handleSave = (data: Partial<User>) => {
    if (editingUser) {
      updateUser(data);
    } else {
      createUser(data);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const handleTierChange = (userId: number, tierId: number) => {
    updateUserTier({ id: userId, tierId });
  };

  const openLimitsModal = (user: User) => {
    setUserForLimits(user);
    setIsLimitsModalOpen(true);
  };

  const handleSaveLimits = (userId: number, limits: Partial<TierLimits>) => {
    updateUserLimits({ id: userId, limits });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage all admin accounts.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm"
        >
          <Plus
            className={`w-5 h-5 ${
              document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
            }`}
          />
          Add Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                Username
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                Agency Name
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                Tier
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                Status
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoadingAdmins ? (
              <tr>
                <td colSpan={5} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : (
              adminUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {user.username}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.agencyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.tierId || 1}
                      onChange={(e) =>
                        handleTierChange(user.id, Number(e.target.value))
                      }
                      className="px-3 py-1 border border-gray-300 rounded-lg bg-white"
                      onClick={(e) => e.stopPropagation()}
                      disabled={isLoadingTiers}
                    >
                      {tiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label
                      htmlFor={`toggle-${user.id}`}
                      className="flex items-center cursor-pointer"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          id={`toggle-${user.id}`}
                          className="sr-only"
                          checked={!!user.activeUser}
                          onChange={() => handleToggleStatus(user)}
                        />
                        <div
                          className={`block w-14 h-8 rounded-full ${
                            user.activeUser ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></div>
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                            user.activeUser ? "translate-x-6" : ""
                          }`}
                        ></div>
                      </div>
                      <div className="ml-3 text-gray-700 font-medium">
                        {user.activeUser ? "Active" : "Inactive"}
                      </div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openLimitsModal(user)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Manage Limits"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Edit Admin User" : "Add Admin User"}
      >
        <AdminForm
          user={editingUser}
          tiers={tiers}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <LimitsModal
        user={userForLimits}
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        onSave={handleSaveLimits}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Admin User"
        message="Are you sure you want to delete this admin account? This action is permanent and will remove all associated data."
      />
    </div>
  );
}
