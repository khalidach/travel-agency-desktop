import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Payment } from "../context/models";

interface PaymentFormProps {
  payment?: Payment;
  onSave: (payment: Omit<Payment, "_id" | "id">) => void;
  onCancel: () => void;
  remainingBalance: number;
}

export default function PaymentForm({
  payment,
  onSave,
  onCancel,
  remainingBalance,
}: PaymentFormProps) {
  const { t } = useTranslation();

  const getInitialFormData = (): Omit<Payment, "_id" | "id"> => {
    if (payment) {
      return {
        amount: payment.amount,
        method: payment.method,
        date: payment.date
          ? new Date(payment.date).toISOString().split("T")[0]
          : "",
        chequeNumber: payment.chequeNumber || "",
        bankName: payment.bankName || "",
        chequeCashingDate: payment.chequeCashingDate
          ? new Date(payment.chequeCashingDate).toISOString().split("T")[0]
          : "",
      };
    }
    return {
      amount: 0,
      method: "cash",
      date: new Date().toISOString().split("T")[0],
      chequeNumber: "",
      bankName: "",
      chequeCashingDate: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When the payment prop changes (e.g., when opening the modal for a new payment),
    // reset the form data.
    setFormData(getInitialFormData());
    setError(null);
  }, [payment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // When editing, the validation balance should be the current remaining balance plus the amount of the payment being edited.
    const validationBalance = payment
      ? remainingBalance + payment.amount
      : remainingBalance;

    if (formData.amount > validationBalance) {
      setError(
        t("amountExceedsBalance", {
          balance: validationBalance.toLocaleString(),
        })
      );
      return;
    }

    if (formData.amount <= 0) {
      setError(t("amountGreaterThanZero"));
      return;
    }

    onSave(formData);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({ ...prev, amount }));
    const validationBalance = payment
      ? remainingBalance + payment.amount
      : remainingBalance;
    // Clear error if the new amount is valid
    if (amount <= validationBalance) {
      setError(null);
    }
  };

  const paymentMethods = [
    { value: "cash", label: t("cash") },
    { value: "cheque", label: t("cheque") },
    { value: "transfer", label: t("transfer") },
    { value: "card", label: t("card") },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("paymentAmount")}
        </label>
        <input
          type="number"
          value={formData.amount || ""}
          onChange={handleAmountChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          min="0"
          step="0.01"
          required
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        <p className="mt-1 text-sm text-gray-500">
          {t("remainingBalance")}: {remainingBalance.toLocaleString()}{" "}
          {t("mad")}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("paymentMethod")}
        </label>
        <select
          value={formData.method}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, method: e.target.value as any }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        >
          {paymentMethods.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("paymentDate")}
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, date: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        />
      </div>
      {formData.method === "cheque" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("chequeNumber")}
            </label>
            <input
              type="text"
              value={formData.chequeNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  chequeNumber: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("bankName")}
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bankName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("checkCashingDate")}
            </label>
            <input
              type="date"
              value={formData.chequeCashingDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  chequeCashingDate: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        </>
      )}
      <div className="flex justify-end space-x-4 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t("savePayment")}
        </button>
      </div>
    </form>
  );
}
