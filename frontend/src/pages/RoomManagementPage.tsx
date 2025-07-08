// frontend/src/pages/RoomManagementPage.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, BedDouble } from "lucide-react";

// Components
import ProgramCard from "../components/booking/ProgramCard";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import { usePagination } from "../hooks/usePagination";

// Types and API
import type { Program, PaginatedResponse } from "../context/models";
import * as api from "../services/api";

export default function RoomManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const programsPerPage = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearchTerm, filterType]);

  const { data: programResponse, isLoading: isLoadingPrograms } = useQuery<
    PaginatedResponse<Program>
  >({
    queryKey: [
      "programsForRoomManagement",
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

  const programs = programResponse?.data ?? [];
  const pagination = programResponse?.pagination;

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: programsPerPage,
  });

  const handleProgramSelect = (pId: number) => {
    navigate(`/room-management/program/${pId}`);
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

  if (isLoadingPrograms) {
    return <BookingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("roomManagementTitle")}
          </h1>
          <p className="text-gray-600 mt-2">{t("roomManagementSubtitle")}</p>
        </div>
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
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            bookingCount={program.totalBookings || 0}
            onClick={() => handleProgramSelect(program.id)}
          />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center py-3 px-6 border-t border-gray-200 bg-white rounded-2xl">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className={`w-4 h-4 ${document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"}`} />
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

      {programs.length === 0 && !isLoadingPrograms && (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BedDouble className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("noProgramsRoom")}
          </h3>
          <p className="text-gray-500">{t("noProgramsLeadRoom")}</p>
        </div>
      )}
    </div>
  );
}
