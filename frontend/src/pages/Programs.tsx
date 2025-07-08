// frontend/src/pages/Programs.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  Users,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Modal from "../components/Modal";
import ProgramForm from "../components/ProgramForm";
import ProgramsSkeleton from "../components/skeletons/ProgramsSkeleton";
import type { Program, PaginatedResponse } from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import { usePagination } from "../hooks/usePagination";
import { useAuthContext } from "../context/AuthContext";
import ConfirmationModal from "../components/modals/ConfirmationModal";

export default function Programs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { state } = useAuthContext();
  const currentUser = state.user;
  const [currentPage, setCurrentPage] = useState(1);
  const programsPerPage = 6;

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<number | null>(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Reset page to 1 when a new search is submitted
  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearchTerm, filterType]);

  const {
    data: programResponse,
    isLoading,
    isError,
  } = useQuery<PaginatedResponse<Program>>({
    queryKey: ["programs", currentPage, submittedSearchTerm, filterType],
    queryFn: () =>
      api.getPrograms(
        currentPage,
        programsPerPage,
        submittedSearchTerm,
        filterType
      ),
  });

  const programs = programResponse?.data ?? [];
  const pagination = programResponse?.pagination;

  const { mutate: createProgram } = useMutation({
    mutationFn: (data: Program) => api.createProgram(data),
    onSuccess: () => {
      // Invalidate all queries in the cache to ensure the entire application state is fresh.
      queryClient.invalidateQueries();
      toast.success("Program created successfully!");
      setIsFormModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create program.");
    },
  });

  const { mutate: updateProgram } = useMutation({
    mutationFn: (program: Program) => api.updateProgram(program.id, program),
    onSuccess: () => {
      // Invalidate all queries in the cache to ensure the entire application state is fresh.
      queryClient.invalidateQueries();
      toast.success("Program updated successfully!");
      setIsFormModalOpen(false);
      setEditingProgram(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update program.");
    },
  });

  const { mutate: deleteProgram } = useMutation({
    mutationFn: (id: number) => api.deleteProgram(id),
    onSuccess: () => {
      // Invalidate all queries in the cache to ensure the entire application state is fresh.
      queryClient.invalidateQueries();
      toast.success("Program deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete program.");
    },
  });

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: programsPerPage,
  });

  const handleAddProgram = () => {
    setEditingProgram(null);
    setIsFormModalOpen(true);
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setIsFormModalOpen(true);
  };

  const handleDeleteProgram = (programId: number) => {
    setProgramToDelete(programId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (programToDelete !== null) {
      deleteProgram(programToDelete);
      setIsDeleteModalOpen(false);
      setProgramToDelete(null);
    }
  };

  const handleSaveProgram = (program: Program) => {
    if (editingProgram) {
      updateProgram(program);
    } else {
      createProgram(program);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setSubmittedSearchTerm(searchTerm);
    }
  };

  const handleFilterChange = (newFilterType: string) => {
    setFilterType(newFilterType);
    setSubmittedSearchTerm(searchTerm);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700";
      case "Tourism":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return <ProgramsSkeleton />;
  }

  if (isError) {
    return <div>{t("errorLoadingDashboard")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("programsTitle")}
          </h1>
          <p className="text-gray-600 mt-2">{t("programsSubtitle")}</p>
        </div>
        <button
          onClick={handleAddProgram}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus
            className={`w-5 h-5 ${
              document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
            }`}
          />
          {t("addProgram")}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t("searchProgramsPlaceholder") as string}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{t("allTypes")}</option>
            <option value="Hajj">Hajj</option>
            <option value="Umrah">Umrah</option>
            <option value="Tourism">Tourism</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => {
          const canModify =
            currentUser?.role === "admin" ||
            currentUser?.id === program.employeeId;
          const packageCount = (program.packages ?? []).length;
          return (
            <div
              key={program.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {program.name}
                  </h3>
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-2 ${getTypeColor(
                      program.type
                    )}`}
                  >
                    {program.type}
                  </span>
                </div>
                {canModify && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditProgram(program)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(program.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar
                    className={`w-4 h-4 ${
                      document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                    }`}
                  />
                  <span>
                    {program.duration} {t("days")}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin
                    className={`w-4 h-4 ${
                      document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                    }`}
                  />
                  <span>
                    {program.cities.map((city) => city.name).join(", ")}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users
                    className={`w-4 h-4 ${
                      document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                    }`}
                  />
                  <span>
                    {packageCount} {t("package", { count: packageCount })}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {(program.packages ?? []).map((pkg, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                    >
                      {pkg.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center text-sm text-gray-600 pt-3 mt-3 border-t border-gray-100">
                  <Users
                    className={`w-4 h-4 ${
                      document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                    }`}
                  />
                  <span>
                    {t("totalBookings")}: {program.totalBookings || 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center py-3 px-6 border-t border-gray-200 bg-white rounded-b-2xl">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t("previous")}
          </button>
          <div className="flex items-center space-x-1">
            {paginationRange.map((pageNumber, index) => {
              if (typeof pageNumber === "string") {
                return (
                  <span key={index} className="px-3 py-1 text-sm text-gray-400">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={index}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentPage === pageNumber
                      ? "bg-blue-600 text-white font-bold shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(prev + 1, pagination.totalPages)
              )
            }
            disabled={currentPage === pagination.totalPages}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("next")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {programs.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("noProgramsFound")}
          </h3>
          <p className="text-gray-500 mb-6">{t("noProgramsLead")}</p>
        </div>
      )}

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingProgram(null);
        }}
        title={editingProgram ? t("editProgram") : t("addProgram")}
        size="xl"
      >
        <ProgramForm
          program={editingProgram}
          onSave={handleSaveProgram}
          onCancel={() => {
            setIsFormModalOpen(false);
            setEditingProgram(null);
          }}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t("deleteProgramTitle")}
        message={t("deleteProgramMessage")}
      />
    </div>
  );
}
