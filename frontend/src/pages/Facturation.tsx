// frontend/src/pages/Facturation.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Download,
  Edit2,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as api from "../services/api";
import { Facture, PaginatedResponse } from "../context/models";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import FactureForm from "../components/facturation/FactureForm";
import FacturePDF from "../components/facturation/FacturePDF";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { usePagination } from "../hooks/usePagination";
import PaginationControls from "../components/booking/PaginationControls";

export default function Facturation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacture, setEditingFacture] = useState<Facture | null>(null);
  const [factureToDelete, setFactureToDelete] = useState<number | null>(null);
  const [factureToPreview, setFactureToPreview] = useState<Facture | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const facturesPerPage = 10;

  const { data: facturesResponse, isLoading } = useQuery<
    PaginatedResponse<Facture>
  >({
    queryKey: ["factures", currentPage],
    queryFn: () => api.getFactures(currentPage, facturesPerPage),
    placeholderData: (prev) => prev,
  });

  const factures = facturesResponse?.data ?? [];
  const pagination = facturesResponse?.pagination;

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: facturesPerPage,
    siblingCount: 1,
  });

  const { mutate: createFacture } = useMutation({
    mutationFn: (
      data: Omit<
        Facture,
        "id" | "facture_number" | "createdAt" | "updatedAt" | "userId"
      >
    ) => api.createFacture(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Document created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: updateFacture } = useMutation({
    mutationFn: (data: Facture) => api.updateFacture(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Document updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteFacture } = useMutation({
    mutationFn: (id: number) => api.deleteFacture(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      toast.success("Document deleted successfully!");
      setFactureToDelete(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = (
    data: Omit<
      Facture,
      "id" | "facture_number" | "createdAt" | "updatedAt" | "userId"
    >
  ) => {
    if (editingFacture) {
      updateFacture({ ...editingFacture, ...data });
    } else {
      createFacture(data);
    }
  };

  const handleDownloadPDF = async (facture: Facture) => {
    setFactureToPreview(facture);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const input = document.getElementById("pdf-preview");
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(
          `${facture.type}_${facture.clientName.replace(/\s/g, "_")}.pdf`
        );
        setFactureToPreview(null);
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("facturationTitle")}
          </h1>
          <p className="text-gray-600 mt-2">{t("facturationSubtitle")}</p>
        </div>
        <button
          onClick={() => {
            setEditingFacture(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm"
        >
          <Plus
            className={`w-5 h-5 ${
              document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
            }`}
          />
          {t("newDocument")}
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
                N°
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("documentType")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("clientName")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("documentDate")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("total")}
              </th>
              <th
                className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : factures.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-12">
                  <FileText className="w-12 h-12 mx-auto text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {t("noDocuments")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("createFirstDocument")}
                  </p>
                </td>
              </tr>
            ) : (
              factures.map((facture) => (
                <tr key={facture.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {facture.facture_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                    {t(facture.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {facture.clientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(facture.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {facture.total.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownloadPDF(facture)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFacture(facture);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFactureToDelete(facture.id)}
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingFacture(null);
        }}
        title={editingFacture ? t("updateDocument") : t("newDocument")}
        size="xl"
      >
        <FactureForm
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
          existingFacture={editingFacture}
        />
      </Modal>

      <ConfirmationModal
        isOpen={!!factureToDelete}
        onClose={() => setFactureToDelete(null)}
        onConfirm={() => deleteFacture(factureToDelete!)}
        title={t("deleteDocumentTitle")}
        message={t("deleteDocumentMessage")}
      />

      {factureToPreview && (
        <div style={{ position: "fixed", left: "-9999px", top: "-9999px" }}>
          <div id="pdf-preview">
            <FacturePDF facture={factureToPreview} />
          </div>
        </div>
      )}
    </div>
  );
}
