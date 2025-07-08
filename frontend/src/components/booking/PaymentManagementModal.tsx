// frontend/src/components/booking/PaymentManagementModal.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../Modal";
import PaymentForm from "../PaymentForm";
import ConfirmationModal from "../modals/ConfirmationModal";
import { CreditCard, Edit2, Trash2 } from "lucide-react";
import type { Booking, Payment } from "../../context/models";

interface PaymentManagementModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (payment: Omit<Payment, "_id" | "id">) => void;
  onUpdatePayment: (
    paymentId: string,
    payment: Omit<Payment, "_id" | "id">
  ) => void;
  onDeletePayment: (paymentId: string) => void;
}

export default function PaymentManagementModal({
  booking,
  isOpen,
  onClose,
  onSavePayment,
  onUpdatePayment,
  onDeletePayment,
}: PaymentManagementModalProps) {
  const { t } = useTranslation();
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleAddPaymentClick = () => {
    setEditingPayment(null);
    setIsPaymentFormOpen(true);
  };

  const handleEditPaymentClick = (payment: Payment) => {
    setEditingPayment(payment);
    setIsPaymentFormOpen(true);
  };

  const handleSavePaymentForm = (paymentData: Omit<Payment, "_id" | "id">) => {
    if (editingPayment) {
      onUpdatePayment(editingPayment._id, paymentData);
    } else {
      onSavePayment(paymentData);
    }
    setIsPaymentFormOpen(false);
    setEditingPayment(null);
  };

  const handleDeletePaymentClick = (paymentId: string) => {
    setPaymentToDelete(paymentId);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      onDeletePayment(paymentToDelete);
      setPaymentToDelete(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isPaymentFormOpen}
        onClose={onClose}
        title={t("managePayments")}
        size="xl"
        level={0}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              {booking.clientNameFr}
            </h3>
            <button
              onClick={handleAddPaymentClick}
              className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CreditCard
                className={`w-4 h-4 ${
                  document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                }`}
              />
              {t("addPayment")}
            </button>
          </div>
          <div
            className="space-y-3"
            key={(booking.advancePayments || []).length}
          >
            {(booking.advancePayments || []).map((payment) => (
              <div
                key={`${payment._id}-${payment.amount}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">
                      {Number(payment.amount).toLocaleString()} {t("mad")}
                    </span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-sm text-gray-600 capitalize">
                      {t(payment.method)}
                    </span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-sm text-gray-600">
                      {new Date(payment.date).toLocaleDateString()}
                    </span>
                  </div>
                  {payment.method === "cheque" && payment.chequeNumber && (
                    <div className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">
                        {t("chequeNumber")} #{payment.chequeNumber}
                      </span>
                      {payment.bankName && <span> • {payment.bankName}</span>}
                      {payment.chequeCashingDate && (
                        <span>
                          {" "}
                          • {t("checkCashingDate")}:{" "}
                          {new Date(
                            payment.chequeCashingDate
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditPaymentClick(payment)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePaymentClick(payment._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {(!booking.advancePayments ||
              booking.advancePayments.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                {t("noPaymentsRecorded")}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPaymentFormOpen}
        onClose={() => setIsPaymentFormOpen(false)}
        title={editingPayment ? t("editPayment") : t("addPayment")}
        size="md"
        level={1}
      >
        <PaymentForm
          payment={editingPayment || undefined}
          onSave={handleSavePaymentForm}
          onCancel={() => setIsPaymentFormOpen(false)}
          remainingBalance={booking.remainingBalance || 0}
        />
      </Modal>

      {paymentToDelete && (
        <ConfirmationModal
          isOpen={!!paymentToDelete}
          onClose={() => setPaymentToDelete(null)}
          onConfirm={confirmDeletePayment}
          title={t("deletePaymentTitle")}
          message={t("deletePaymentMessage")}
        />
      )}
    </>
  );
}
