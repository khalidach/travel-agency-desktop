// frontend/src/pages/ProgramPricing.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Program,
  ProgramPricing,
  PaginatedResponse,
} from "../context/models";
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plane,
  CreditCard,
  User,
  Hotel,
  BedDouble,
  Bus,
  Users,
} from "lucide-react";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import { usePagination } from "../hooks/usePagination";
import { useAuthContext } from "../context/AuthContext";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import Modal from "../components/Modal";
import ProgramPricingForm from "../components/ProgramPricingForm";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";

export default function ProgramPricingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { state: authState } = useAuthContext();
  const currentUser = authState.user;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pricingToDelete, setPricingToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const programsPerPage = 6;
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearchTerm, filterType]);

  const { data: programsResponse, isLoading: isLoadingPrograms } = useQuery<
    PaginatedResponse<Program>
  >({
    queryKey: [
      "programsWithPricing",
      currentPage,
      submittedSearchTerm,
      filterType,
    ],
    queryFn: () =>
      api.getPrograms(
        currentPage,
        programsPerPage,
        submittedSearchTerm,
        filterType
      ),
  });

  const programs = programsResponse?.data ?? [];
  const pagination = programsResponse?.pagination;

  const { mutate: createPricing, isPending: isCreating } = useMutation({
    mutationFn: (data: any) => api.createProgramPricing(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["programsWithPricing"] });
      queryClient.invalidateQueries({
        queryKey: ["bookingsByProgram", String(variables.programId)],
      });
      toast.success("Pricing saved successfully.");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save pricing.");
    },
  });

  const { mutate: updatePricing, isPending: isUpdating } = useMutation({
    mutationFn: (data: ProgramPricing) =>
      api.updateProgramPricing(data.id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["programsWithPricing"] });
      queryClient.invalidateQueries({
        queryKey: ["bookingsByProgram", String(variables.programId)],
      });
      toast.success("Pricing updated successfully.");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update pricing.");
    },
  });

  const { mutate: deletePricing } = useMutation({
    mutationFn: (id: number) => api.deleteProgramPricing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programsWithPricing"] });
      queryClient.invalidateQueries({ queryKey: ["bookingsByProgram"] });
      toast.success("Pricing deleted successfully.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete pricing.");
    },
  });

  const handleEditPricing = (program: Program) => {
    setSelectedProgram(program);
    setIsModalOpen(true);
  };

  const handleDeletePricing = (pricingId: number) => {
    setPricingToDelete(pricingId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (pricingToDelete) {
      deletePricing(pricingToDelete);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSave = (data: ProgramPricing | Omit<ProgramPricing, "id">) => {
    if ("id" in data) {
      updatePricing(data);
    } else {
      createPricing(data);
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

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: programsPerPage,
  });

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

  if (isLoadingPrograms) {
    return <BookingSkeleton />;
  }

  return (
    <div className="mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">{t("programPricing")}</h1>
      <p className="text-gray-600 -mt-4 mb-4">{t("programPricingSubtitle")}</p>

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {programs.map((program) => {
          const pricing = program.pricing;
          const canModify =
            currentUser?.role === "admin" ||
            currentUser?.id === pricing?.employeeId ||
            !pricing;

          const hotelSet = new Set<string>();
          if (program.packages) {
            program.packages.forEach((pkg) => {
              if (pkg.hotels) {
                Object.values(pkg.hotels).forEach((hotelList: string[]) => {
                  hotelList.forEach((hotelName) => {
                    if (hotelName) hotelSet.add(hotelName);
                  });
                });
              }
            });
          }
          const totalHotels = hotelSet.size;

          const roomTypeSet = new Set<string>();
          if (program.packages) {
            program.packages.forEach((pkg) => {
              if (pkg.prices) {
                pkg.prices.forEach((price) => {
                  if (price.roomTypes) {
                    price.roomTypes.forEach((rt) => {
                      if (rt.type) roomTypeSet.add(rt.type);
                    });
                  }
                });
              }
            });
          }
          const totalRoomTypes = roomTypeSet.size;

          const adultTicket =
            pricing?.personTypes?.find((p) => p.type === "adult")
              ?.ticketPercentage ?? "N/A";
          const childTicket =
            pricing?.personTypes?.find((p) => p.type === "child")
              ?.ticketPercentage ?? "N/A";
          const infantTicket =
            pricing?.personTypes?.find((p) => p.type === "infant")
              ?.ticketPercentage ?? "N/A";

          return (
            <div
              key={program.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {program.name}
                    </h3>
                    <span
                      className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getTypeColor(
                        program.type
                      )}`}
                    >
                      {program.type}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {canModify && (
                      <button
                        onClick={() => handleEditPricing(program)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {pricing && canModify && (
                      <button
                        onClick={() => handleDeletePricing(pricing.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {pricing ? (
                  <div className="space-y-3 mb-4 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users
                          className={`w-4 h-4 text-gray-400 ${
                            document.documentElement.dir === "rtl"
                              ? "ml-2"
                              : "mr-2"
                          }`}
                        />
                        <span>
                          Adult:{" "}
                          <span className="font-medium text-gray-800">
                            {adultTicket}%
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span>
                          Child:{" "}
                          <span className="font-medium text-gray-800">
                            {childTicket}%
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span>
                          Infant:{" "}
                          <span className="font-medium text-gray-800">
                            {infantTicket}%
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Plane
                        className={`w-4 h-4 text-gray-400 ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      {t("flightTicketPrice")}:{" "}
                      <span
                        className={`font-medium text-gray-800 ${
                          document.documentElement.dir === "rtl"
                            ? "mr-1"
                            : "ml-1"
                        }`}
                      >
                        {Number(pricing.ticketAirline || 0).toLocaleString()}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Bus
                        className={`w-4 h-4 text-gray-400 ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      {t("transportFees")}:{" "}
                      <span
                        className={`font-medium text-gray-800 ${
                          document.documentElement.dir === "rtl"
                            ? "mr-1"
                            : "ml-1"
                        }`}
                      >
                        {Number(pricing.transportFees || 0).toLocaleString()}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <CreditCard
                        className={`w-4 h-4 text-gray-400 ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      {t("visaFees")}:{" "}
                      <span
                        className={`font-medium text-gray-800 ${
                          document.documentElement.dir === "rtl"
                            ? "mr-1"
                            : "ml-1"
                        }`}
                      >
                        {Number(pricing.visaFees || 0).toLocaleString()}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <User
                        className={`w-4 h-4 text-gray-400 ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      {t("guideFees")}:{" "}
                      <span
                        className={`font-medium text-gray-800 ${
                          document.documentElement.dir === "rtl"
                            ? "mr-1"
                            : "ml-1"
                        }`}
                      >
                        {Number(pricing.guideFees || 0).toLocaleString()}{" "}
                        {t("mad")}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Hotel
                        className={`w-4 h-4 text-gray-400 ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      {t("hotels")}:{" "}
                      <span
                        className={`font-medium text-gray-800 ${
                          document.documentElement.dir === "rtl"
                            ? "mr-1"
                            : "ml-1"
                        }`}
                      >
                        {totalHotels}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <BedDouble
                        className={`w-4 h-4 text-gray-400 ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      {t("roomType")}:{" "}
                      <span
                        className={`font-medium text-gray-800 ${
                          document.documentElement.dir === "rtl"
                            ? "mr-1"
                            : "ml-1"
                        }`}
                      >
                        {totalRoomTypes}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    {t("noPricingSet")}
                  </div>
                )}
              </div>

              {pricing && (
                <div className="pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                  {pricing.employeeName && (
                    <div className="flex items-center">
                      <User
                        className={`w-4 h-4 text-gray-400 ${
                          document.documentElement.dir === "rtl"
                            ? "ml-2"
                            : "mr-2"
                        }`}
                      />
                      <span>
                        {t("addedBy")}{" "}
                        <span className="font-medium text-gray-800">
                          {pricing.employeeName}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft
              className={`w-4 h-4 ${
                document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"
              }`}
            />
            {t("previous")}
          </button>
          <div className="flex items-center space-x-1">
            {paginationRange.map((page, i) =>
              typeof page === "string" ? (
                <span key={`dots-${i}`} className="px-3 py-1">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(prev + 1, pagination.totalPages)
              )
            }
            disabled={currentPage === pagination.totalPages}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {t("next")}
            <ChevronRight
              className={`w-4 h-4 ${
                document.documentElement.dir === "rtl" ? "mr-1" : "ml-1"
              }`}
            />
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedProgram
            ? t("pricingFor", { programName: selectedProgram.name })
            : t("programPricing")
        }
        size="xl"
      >
        {selectedProgram && (
          <ProgramPricingForm
            program={selectedProgram}
            existingPricing={selectedProgram.pricing}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
            isSaving={isCreating || isUpdating}
          />
        )}
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t("deletePricingTitle")}
        message={t("deletePricingMessage")}
      />
    </div>
  );
}
