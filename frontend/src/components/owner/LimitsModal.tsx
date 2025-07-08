// frontend/src/components/owner/LimitsModal.tsx
import React, { useState, useEffect } from "react";
import Modal from "../Modal";
import { User, TierLimits } from "../../context/models";

interface LimitsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: number, limits: Partial<TierLimits>) => void;
}

// Define a more accurate type for the form's state, allowing for empty strings for number fields
type LimitsFormState = {
  [K in keyof TierLimits]?: TierLimits[K] | "";
};

const LimitsModal: React.FC<LimitsModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [limits, setLimits] = useState<LimitsFormState>({});

  useEffect(() => {
    if (user) {
      // Initialize the form state with ONLY the user's custom limits.
      // If user.limits is null or undefined, start with an empty object.
      setLimits(user.limits || {});
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const isBooleanField = name === "invoicing" || name === "dailyServices";

    let processedValue: string | number | boolean | undefined;

    if (isBooleanField) {
      if (value === "true") {
        processedValue = true;
      } else if (value === "false") {
        processedValue = false;
      } else {
        // An empty string from the select means "unset this override"
        processedValue = undefined;
      }
    } else {
      // For number inputs, store an empty string or a number
      processedValue = value === "" ? "" : Number(value);
    }

    setLimits((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalLimits: Partial<TierLimits> = {};
    // Iterate over the keys of the state object in a type-safe way
    (Object.keys(limits) as Array<keyof TierLimits>).forEach((key) => {
      const value = limits[key];

      // Filter out any keys that have been unset (value is undefined or an empty string)
      if (value !== undefined && value !== "") {
        // Based on the key, we can safely assert the type of the value.
        if (key === "invoicing" || key === "dailyServices") {
          finalLimits[key] = value as boolean;
        } else {
          finalLimits[key] = value as number;
        }
      }
    });

    onSave(user.id, finalLimits);
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Limits for ${user.username}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Set custom limits for this user. Leave a field blank to use the
          default limit from their tier (Tier {user.tierId}). Use -1 for
          unlimited.
        </p>

        {limitFields.map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 capitalize">
              {field.replace(/([A-Z])/g, " $1").trim()}
            </label>
            <input
              type="number"
              name={field}
              // Use `?? ''` to prevent React's uncontrolled/controlled component warning
              value={limits[field] ?? ""}
              onChange={handleChange}
              placeholder={`Default: ${user.tierLimits?.[field] ?? "N/A"}`}
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
            // Use `?? ''` to handle undefined (default) case
            value={
              limits.invoicing === undefined ? "" : String(limits.invoicing)
            }
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.invoicing ? "Enabled" : "Disabled"})
            </option>
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
            value={
              limits.dailyServices === undefined
                ? ""
                : String(limits.dailyServices)
            }
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="">
              Use Tier Default (
              {user.tierLimits?.dailyServices ? "Enabled" : "Disabled"})
            </option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Save Limits
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LimitsModal;
