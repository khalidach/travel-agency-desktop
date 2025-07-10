// frontend/src/pages/BookingPage.tsx
import React, { useMemo, useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus } from "lucide-react";

// Components and Hooks
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import BookingForm, { BookingFormData } from "../components/BookingForm";
import BookingSummary from "../components/booking/BookingSummary";
import BookingFilters from "../components/booking/BookingFilters";
import BookingTable from "../components/booking/BookingTable";
import { usePagination } from "../hooks/usePagination";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import BookingPageHeader from "../components/booking/BookingPageHeader";
import PaymentManagementModal from "../components/booking/PaymentManagementModal";
import PaginationControls from "../components/booking/PaginationControls";
import { useDebounce } from "../hooks/useDebounce";

// Types and API
import type {
  Booking,
  Payment,
  Program,
  BookingSummaryStats,
} from "../context/models";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";

// State and Actions for useReducer
interface BookingPageState {
  isBookingModalOpen: boolean;
  editingBooking: Booking | null;
  selectedBookingForPayment: Booking | null;
  bookingToDelete: number | null;
  isExporting: boolean;
  importFile: File | null;
  currentPage: number;
  selectedBookingIds: Set<number>;
  isSelectAllMode: boolean; // New flag for selecting all bookings matching filters
}

type BookingPageAction =
  | { type: "OPEN_BOOKING_MODAL"; payload?: Booking | null }
  | { type: "CLOSE_BOOKING_MODAL" }
  | { type: "SET_SELECTED_FOR_PAYMENT"; payload: Booking | null }
  | { type: "SET_BOOKING_TO_DELETE"; payload: number | null }
  | { type: "SET_IS_EXPORTING"; payload: boolean }
  | { type: "SET_IMPORT_FILE"; payload: File | null }
  | { type: "SET_CURRENT_PAGE"; payload: number }
  | { type: "TOGGLE_SELECTION"; payload: { id: number } }
  | {
      type: "TOGGLE_PAGE_SELECTION";
      payload: { ids: number[]; select: boolean };
    }
  | { type: "TOGGLE_SELECT_ALL_MODE" }
  | { type: "CLEAR_SELECTION" };

const initialState: BookingPageState = {
  isBookingModalOpen: false,
  editingBooking: null,
  selectedBookingForPayment: null,
  bookingToDelete: null,
  isExporting: false,
  importFile: null,
  currentPage: 1,
  selectedBookingIds: new Set(),
  isSelectAllMode: false,
};

function bookingPageReducer(
  state: BookingPageState,
  action: BookingPageAction
): BookingPageState {
  switch (action.type) {
    case "OPEN_BOOKING_MODAL":
      return {
        ...state,
        isBookingModalOpen: true,
        editingBooking: action.payload || null,
      };
    case "CLOSE_BOOKING_MODAL":
      return { ...state, isBookingModalOpen: false, editingBooking: null };
    case "SET_SELECTED_FOR_PAYMENT":
      return { ...state, selectedBookingForPayment: action.payload };
    case "SET_BOOKING_TO_DELETE":
      return { ...state, bookingToDelete: action.payload };
    case "SET_IS_EXPORTING":
      return { ...state, isExporting: action.payload };
    case "SET_IMPORT_FILE":
      return { ...state, importFile: action.payload };
    case "SET_CURRENT_PAGE":
      return { ...state, currentPage: action.payload };
    case "TOGGLE_SELECTION":
      const newSelection = new Set(state.selectedBookingIds);
      if (newSelection.has(action.payload.id)) {
        newSelection.delete(action.payload.id);
      } else {
        newSelection.add(action.payload.id);
      }
      return {
        ...state,
        selectedBookingIds: newSelection,
        isSelectAllMode: false,
      };
    case "TOGGLE_PAGE_SELECTION":
      const updatedSelection = new Set(state.selectedBookingIds);
      if (action.payload.select) {
        action.payload.ids.forEach((id) => updatedSelection.add(id));
      } else {
        action.payload.ids.forEach((id) => updatedSelection.delete(id));
      }
      return {
        ...state,
        selectedBookingIds: updatedSelection,
        isSelectAllMode: false,
      };
    case "TOGGLE_SELECT_ALL_MODE":
      return {
        ...state,
        isSelectAllMode: !state.isSelectAllMode,
        selectedBookingIds: new Set(),
      };
    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedBookingIds: new Set(),
        isSelectAllMode: false,
      };
    default:
      return state;
  }
}

type FilterFormData = {
  searchTerm: string;
  sortOrder: string;
  statusFilter: string;
};

interface BookingResponse {
  data: Booking[];
  pagination: { totalPages: number; totalCount: number };
  summary: BookingSummaryStats;
}

export default function BookingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { programId } = useParams<{ programId: string }>();

  const [state, dispatch] = useReducer(bookingPageReducer, initialState);
  const {
    isBookingModalOpen,
    editingBooking,
    selectedBookingForPayment,
    bookingToDelete,
    isExporting,
    importFile,
    currentPage,
    selectedBookingIds,
    isSelectAllMode,
  } = state;

  const bookingsPerPage = 10;

  const { register, watch } = useForm<FilterFormData>({
    defaultValues: { searchTerm: "", sortOrder: "newest", statusFilter: "all" },
  });

  const searchTerm = watch("searchTerm");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const sortOrder = watch("sortOrder");
  const statusFilter = watch("statusFilter");

  useEffect(() => {
    dispatch({ type: "SET_CURRENT_PAGE", payload: 1 });
    dispatch({ type: "CLEAR_SELECTION" });
  }, [debouncedSearchTerm, sortOrder, statusFilter]);

  const bookingQueryKey = [
    "bookingsByProgram",
    programId,
    sortOrder === "family" ? "all" : currentPage,
    debouncedSearchTerm,
    sortOrder,
    statusFilter,
  ];

  const { data: bookingResponse, isLoading: isLoadingBookings } =
    useQuery<BookingResponse>({
      queryKey: bookingQueryKey,
      queryFn: () =>
        api.getBookingsByProgram(programId!, {
          page: sortOrder === "family" ? 1 : currentPage,
          limit: sortOrder === "family" ? 9999 : bookingsPerPage,
          searchTerm: debouncedSearchTerm,
          sortOrder,
          statusFilter,
          employeeFilter: "all",
        }),
      enabled: !!programId,
      placeholderData: (prev) => prev,
    });

  const allBookings = bookingResponse?.data ?? [];
  const summaryStats = bookingResponse?.summary;
  const totalBookingCount =
    sortOrder === "family"
      ? allBookings.length
      : bookingResponse?.pagination?.totalCount ?? 0;
  const totalPages = Math.ceil(totalBookingCount / bookingsPerPage);

  const processedBookings = useMemo(() => {
    const bookingsToProcess = allBookings;
    if (sortOrder !== "family" || bookingsToProcess.length === 0) {
      return bookingsToProcess.map((b) => ({ ...b, isRelated: false }));
    }
    const bookingsMap = new Map(bookingsToProcess.map((b) => [b.id, b]));
    const memberIds = new Set<number>();
    bookingsToProcess.forEach((booking) => {
      if (booking.relatedPersons && booking.relatedPersons.length > 0) {
        booking.relatedPersons.forEach((person) => {
          memberIds.add(person.ID);
        });
      }
    });
    const leadersAndIndividuals = bookingsToProcess.filter(
      (booking) => !memberIds.has(booking.id)
    );
    const finalList: (Booking & { isRelated?: boolean })[] = [];
    leadersAndIndividuals.forEach((leader) => {
      finalList.push({ ...leader, isRelated: false });
      if (leader.relatedPersons && leader.relatedPersons.length > 0) {
        leader.relatedPersons.forEach((person) => {
          const memberBooking = bookingsMap.get(person.ID);
          if (memberBooking) {
            finalList.push({ ...memberBooking, isRelated: true });
          }
        });
      }
    });
    const start = (currentPage - 1) * bookingsPerPage;
    const end = start + bookingsPerPage;
    return finalList.slice(start, end);
  }, [allBookings, sortOrder, currentPage, bookingsPerPage]);

  const { data: program, isLoading: isLoadingProgram } = useQuery<Program>({
    queryKey: ["program", programId],
    queryFn: () => api.getProgramById(programId!),
    enabled: !!programId,
  });

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["bookingsByProgram"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["profitReport"] });
    queryClient.invalidateQueries({ queryKey: ["programsForBooking"] });
    queryClient.invalidateQueries({ queryKey: ["programsWithPricing"] });
    queryClient.invalidateQueries({ queryKey: ["programs"] });
  };

  const { mutate: createBooking } = useMutation({
    mutationFn: (data: {
      bookingData: BookingFormData;
      initialPayments: Payment[];
    }) =>
      api.createBooking({
        ...data.bookingData,
        advancePayments: data.initialPayments,
      }),
    onSuccess: () => {
      invalidateAllQueries();
      toast.success("Booking created!");
      dispatch({ type: "CLOSE_BOOKING_MODAL" });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to create booking."),
  });

  const { mutate: updateBooking } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      bookingData: BookingFormData;
      initialPayments: Payment[];
    }) =>
      api.updateBooking(data.bookingId, {
        ...data.bookingData,
        advancePayments: data.initialPayments,
      }),
    onSuccess: () => {
      invalidateAllQueries();
      toast.success("Booking updated!");
      dispatch({ type: "CLOSE_BOOKING_MODAL" });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update booking."),
  });

  const { mutate: deleteBooking } = useMutation({
    mutationFn: (id: number) => api.deleteBooking(id),
    onSuccess: () => {
      invalidateAllQueries();
      toast.success("Booking deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete booking."),
  });

  const { mutate: deleteMultipleBookings } = useMutation({
    mutationFn: (data: {
      ids?: number[];
      deleteAllMatchingFilters?: boolean;
      filters?: { searchTerm: string; statusFilter: string };
      programId?: string;
    }) => api.deleteMultipleBookings(data),
    onSuccess: () => {
      invalidateAllQueries();
      dispatch({ type: "CLEAR_SELECTION" });
      toast.success("Selected bookings deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete selected bookings."),
  });

  const { mutate: addPayment } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      payment: Omit<Payment, "_id" | "id">;
    }) => api.addPayment(data.bookingId, data.payment),
    onSuccess: (updatedBooking) => {
      invalidateAllQueries();
      dispatch({ type: "SET_SELECTED_FOR_PAYMENT", payload: updatedBooking });
      toast.success("Payment added!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to add payment."),
  });

  const { mutate: updatePayment } = useMutation({
    mutationFn: (data: {
      bookingId: number;
      paymentId: string;
      payment: Omit<Payment, "_id" | "id">;
    }) => api.updatePayment(data.bookingId, data.paymentId, data.payment),
    onSuccess: (updatedBooking) => {
      invalidateAllQueries();
      dispatch({ type: "SET_SELECTED_FOR_PAYMENT", payload: updatedBooking });
      toast.success("Payment updated!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update payment."),
  });

  const { mutate: deletePayment } = useMutation({
    mutationFn: (data: { bookingId: number; paymentId: string }) =>
      api.deletePayment(data.bookingId, data.paymentId),
    onSuccess: (updatedBooking) => {
      invalidateAllQueries();
      dispatch({ type: "SET_SELECTED_FOR_PAYMENT", payload: updatedBooking });
      toast.success("Payment deleted!");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to delete payment."),
  });

  const { mutate: importBookings, isPending: isImporting } = useMutation({
    mutationFn: (file: File) => api.importBookings(file, programId!),
    onSuccess: (result) => {
      invalidateAllQueries();
      toast.success(result.message);
    },
    onError: (error: Error) => toast.error(error.message || "Import failed."),
    onSettled: () => dispatch({ type: "SET_IMPORT_FILE", payload: null }),
  });

  const paginationRange = usePagination({
    currentPage,
    totalCount: totalBookingCount,
    pageSize: bookingsPerPage,
  });

  const handleSaveBooking = (
    bookingData: BookingFormData,
    initialPayments: Payment[]
  ) => {
    if (editingBooking) {
      updateBooking({
        bookingId: editingBooking.id,
        bookingData,
        initialPayments,
      });
    } else {
      createBooking({ bookingData, initialPayments });
    }
  };

  const handleSavePayment = (payment: Omit<Payment, "_id" | "id">) => {
    if (selectedBookingForPayment) {
      addPayment({ bookingId: selectedBookingForPayment.id, payment });
    }
  };

  const handleUpdatePayment = (
    paymentId: string,
    payment: Omit<Payment, "_id" | "id">
  ) => {
    if (selectedBookingForPayment) {
      updatePayment({
        bookingId: selectedBookingForPayment.id,
        paymentId,
        payment,
      });
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    if (selectedBookingForPayment) {
      deletePayment({ bookingId: selectedBookingForPayment.id, paymentId });
    }
  };

  const handleExport = async () => {
    if (!programId || isExporting) return;
    dispatch({ type: "SET_IS_EXPORTING", payload: true });
    toast.loading("Exporting to Excel...");
    try {
      const blob = await api.exportBookingsToExcel(programId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = program
        ? `${program.name.replace(/\s/g, "_")}_bookings.xlsx`
        : "bookings.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Export successful!");
    } catch (error) {
      toast.dismiss();
      toast.error((error as Error).message || "Failed to export.");
    } finally {
      dispatch({ type: "SET_IS_EXPORTING", payload: false });
    }
  };

  const handleExportTemplate = async () => {
    if (!programId) return;
    toast.loading("Generating template...");
    try {
      const blob = await api.exportBookingTemplateForProgram(programId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = program
        ? `${program.name.replace(/\s/g, "_")}_Template.xlsx`
        : "Booking_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Template downloaded!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to download template.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      dispatch({ type: "SET_IMPORT_FILE", payload: e.target.files[0] });
    }
  };
  const handleImport = () => {
    if (importFile && programId) {
      importBookings(importFile);
    }
  };

  const handleToggleSelection = (id: number) => {
    dispatch({ type: "TOGGLE_SELECTION", payload: { id } });
  };

  const handleToggleSelectAll = () => {
    const pageIds = processedBookings.map((b) => b.id);
    const areAllSelected = pageIds.every((id) => selectedBookingIds.has(id));
    dispatch({
      type: "TOGGLE_PAGE_SELECTION",
      payload: { ids: pageIds, select: !areAllSelected },
    });
  };

  const handleDeleteSelected = () => {
    if (isSelectAllMode) {
      deleteMultipleBookings({
        deleteAllMatchingFilters: true,
        filters: { searchTerm: debouncedSearchTerm, statusFilter },
        programId,
      });
    } else {
      deleteMultipleBookings({ ids: Array.from(selectedBookingIds) });
    }
  };

  if (isLoadingProgram) return <BookingSkeleton />;

  return (
    <div className="space-y-6">
      <BookingPageHeader
        program={program}
        onAddBooking={() => dispatch({ type: "OPEN_BOOKING_MODAL" })}
        onExportTemplate={handleExportTemplate}
        onFileSelect={handleFileSelect}
        onImport={handleImport}
        isImporting={isImporting}
        importFile={importFile}
      />

      {summaryStats && !isLoadingBookings ? (
        <BookingSummary stats={summaryStats} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-xl shadow-sm border animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-20 mx-auto" />
              <div className="h-7 bg-gray-200 rounded w-24 mx-auto mt-2" />
            </div>
          ))}
        </div>
      )}

      <BookingFilters
        register={register}
        handleExport={handleExport}
        isExporting={isExporting}
        onSearchKeyDown={() => {}}
        selectedCount={
          isSelectAllMode ? totalBookingCount : selectedBookingIds.size
        }
        onDeleteSelected={handleDeleteSelected}
      />

      {isLoadingBookings && !bookingResponse ? (
        <BookingSkeleton />
      ) : (
        <>
          {selectedBookingIds.size > 0 && (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-r-lg">
              <p>
                {isSelectAllMode ? (
                  <>
                    All {totalBookingCount} bookings matching the current
                    filters are selected.
                    <button
                      onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
                      className="font-bold underline ml-2"
                    >
                      Clear selection
                    </button>
                  </>
                ) : (
                  <>
                    {t("selectedBookingsCount", {
                      count: selectedBookingIds.size,
                    })}{" "}
                    <button
                      onClick={() =>
                        dispatch({ type: "TOGGLE_SELECT_ALL_MODE" })
                      }
                      className="font-bold underline ml-2"
                    >
                      {t("selectAll", { totalBookingCount: totalBookingCount })}
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
          <BookingTable
            bookings={processedBookings}
            programs={program ? [program] : []}
            onEditBooking={(booking) =>
              dispatch({ type: "OPEN_BOOKING_MODAL", payload: booking })
            }
            onDeleteBooking={(id) =>
              dispatch({ type: "SET_BOOKING_TO_DELETE", payload: id })
            }
            onManagePayments={(booking) =>
              dispatch({ type: "SET_SELECTED_FOR_PAYMENT", payload: booking })
            }
            selectedIds={selectedBookingIds}
            onSelectOne={handleToggleSelection}
            onSelectAll={handleToggleSelectAll}
            isSelectAllMode={isSelectAllMode}
          />

          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) =>
                dispatch({ type: "SET_CURRENT_PAGE", payload: page })
              }
              paginationRange={paginationRange}
            />
          )}

          {allBookings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("noBookingsFound")}
              </h3>
              <p className="text-gray-500 mb-6">{t("noBookingsLead")}</p>
              <button
                onClick={() => dispatch({ type: "OPEN_BOOKING_MODAL" })}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus
                  className={`w-5 h-5 ${
                    document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                  }`}
                />
                {t("addBooking")}
              </button>
            </div>
          )}
        </>
      )}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => dispatch({ type: "CLOSE_BOOKING_MODAL" })}
        title={editingBooking ? t("editBooking") : t("addBooking")}
        size="xl"
      >
        <BookingForm
          booking={editingBooking}
          programs={program ? [program] : []}
          onSave={handleSaveBooking}
          onCancel={() => dispatch({ type: "CLOSE_BOOKING_MODAL" })}
          programId={programId}
        />
      </Modal>
      <PaymentManagementModal
        booking={selectedBookingForPayment}
        isOpen={!!selectedBookingForPayment}
        onClose={() =>
          dispatch({ type: "SET_SELECTED_FOR_PAYMENT", payload: null })
        }
        onSavePayment={handleSavePayment}
        onUpdatePayment={handleUpdatePayment}
        onDeletePayment={handleDeletePayment}
      />
      {bookingToDelete && (
        <ConfirmationModal
          isOpen={!!bookingToDelete}
          onClose={() =>
            dispatch({ type: "SET_BOOKING_TO_DELETE", payload: null })
          }
          onConfirm={() => {
            if (bookingToDelete) {
              deleteBooking(bookingToDelete);
            }
            dispatch({ type: "SET_BOOKING_TO_DELETE", payload: null });
          }}
          title={t("deleteBookingTitle")}
          message={t("deleteBookingMessage")}
        />
      )}
    </div>
  );
}
