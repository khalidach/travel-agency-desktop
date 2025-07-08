// frontend/src/pages/EmployeeAnalysis.tsx
import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Package, Calendar, ConciergeBell } from "lucide-react";
import * as api from "../services/api";
import type {
  EmployeeAnalysisData,
  ProgramPerformanceData,
  ServicePerformanceData,
} from "../context/models";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { useTranslation } from "react-i18next";

type DateFilter = "today" | "7days" | "month" | "custom";

// A reusable filter and summary component
const PerformanceCard = ({
  title,
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
  summaryData,
  isLoading,
}: any) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t(title)}</h3>
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
        {/* Date Filter */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setDateFilter("today")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              dateFilter === "today"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("today")}
          </button>
          <button
            onClick={() => setDateFilter("7days")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              dateFilter === "7days"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("last7Days")}
          </button>
          <button
            onClick={() => setDateFilter("month")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              dateFilter === "month"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("last30Days")}
          </button>
          <button
            onClick={() => setDateFilter("custom")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              dateFilter === "custom"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("customRange")}
          </button>
        </div>
      </div>
      {dateFilter === "custom" && (
        <div className="flex items-center space-x-2 mb-4">
          <input
            type="date"
            value={customDateRange.start}
            onChange={(e) =>
              setCustomDateRange({
                ...customDateRange,
                start: e.target.value,
              })
            }
            className="px-3 py-1 border border-gray-300 rounded-lg"
          />
          <span>to</span>
          <input
            type="date"
            value={customDateRange.end}
            onChange={(e) =>
              setCustomDateRange({ ...customDateRange, end: e.target.value })
            }
            className="px-3 py-1 border border-gray-300 rounded-lg"
          />
        </div>
      )}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-full"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-full"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-full"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-full"></div>
        </div>
      ) : (
        <table className="w-full mt-4">
          <tbody>
            {summaryData.map((metric: any) => (
              <tr
                key={metric.title}
                className="border-b last:border-b-0 border-gray-100"
              >
                <td className="py-3 text-base font-medium text-gray-600">
                  {metric.title}
                </td>
                <td className="py-3 text-2xl font-bold text-gray-900 text-right">
                  {metric.value.toLocaleString()} {metric.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default function EmployeeAnalysisPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // State for Program filters
  const [programDateFilter, setProgramDateFilter] =
    useState<DateFilter>("month");
  const [programCustomDate, setProgramCustomDate] = useState({
    start: "",
    end: "",
  });

  // State for Service filters
  const [serviceDateFilter, setServiceDateFilter] =
    useState<DateFilter>("month");
  const [serviceCustomDate, setServiceCustomDate] = useState({
    start: "",
    end: "",
  });

  // Memoized date params for each query
  const programDateParams = useMemo(() => {
    const now = new Date();
    let startDate: Date,
      endDate: Date = endOfDay(now);
    switch (programDateFilter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "month":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "custom":
        if (programCustomDate.start && programCustomDate.end) {
          return {
            startDate: programCustomDate.start,
            endDate: programCustomDate.end,
          };
        }
        return { startDate: undefined, endDate: undefined };
      default:
        startDate = startOfDay(subDays(now, 7));
    }
    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [programDateFilter, programCustomDate]);

  const serviceDateParams = useMemo(() => {
    const now = new Date();
    let startDate: Date,
      endDate: Date = endOfDay(now);
    switch (serviceDateFilter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "month":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "custom":
        if (serviceCustomDate.start && serviceCustomDate.end) {
          return {
            startDate: serviceCustomDate.start,
            endDate: serviceCustomDate.end,
          };
        }
        return { startDate: undefined, endDate: undefined };
      default:
        startDate = startOfDay(subDays(now, 7));
    }
    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [serviceDateFilter, serviceCustomDate]);

  // --- API QUERIES ---
  const { data: analysisData, isLoading: isLoadingAnalysis } =
    useQuery<EmployeeAnalysisData>({
      queryKey: ["employeeAnalysis", username],
      queryFn: () => api.getEmployeeAnalysis(username!),
      enabled: !!username,
    });

  const { data: programData, isLoading: isLoadingProgramData } =
    useQuery<ProgramPerformanceData>({
      queryKey: ["employeeProgramPerformance", username, programDateParams],
      queryFn: () =>
        api.getEmployeeProgramPerformance(
          username!,
          programDateParams.startDate,
          programDateParams.endDate
        ),
      enabled: !!username,
    });

  const { data: serviceData, isLoading: isLoadingServiceData } =
    useQuery<ServicePerformanceData>({
      queryKey: ["employeeServicePerformance", username, serviceDateParams],
      queryFn: () =>
        api.getEmployeeServicePerformance(
          username!,
          serviceDateParams.startDate,
          serviceDateParams.endDate
        ),
      enabled: !!username,
    });

  if (isLoadingAnalysis) {
    return <DashboardSkeleton />;
  }

  if (!analysisData) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">{t("couldNotLoadAnalysis")}</h2>
        <button
          onClick={() => navigate("/employees")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {t("backToEmployees")}
        </button>
      </div>
    );
  }

  const {
    employee,
    programsCreatedCount,
    bookingsMadeCount,
    dailyServicesMadeCount,
  } = analysisData;

  const statCards = [
    {
      title: t("programsAdded"),
      value: programsCreatedCount,
      icon: Package,
    },
    {
      title: t("totalBookingsMade"),
      value: bookingsMadeCount,
      icon: Calendar,
    },
    {
      title: t("totalServicesPerformed"),
      value: dailyServicesMadeCount,
      icon: ConciergeBell,
    },
  ];

  const programSummaryMetrics = [
    {
      title: t("totalBookings"),
      value: programData?.programSummary.totalBookings || 0,
      unit: "",
    },
    {
      title: t("totalRevenue"),
      value: programData?.programSummary.totalRevenue || 0,
      unit: "MAD",
    },
    {
      title: t("totalCost"),
      value: programData?.programSummary.totalCost || 0,
      unit: "MAD",
    },
    {
      title: t("totalProfit"),
      value: programData?.programSummary.totalProfit || 0,
      unit: "MAD",
    },
  ];

  const serviceSummaryMetrics = [
    {
      title: t("totalServicesPerformed"),
      value: serviceData?.serviceSummary.totalServices || 0,
      unit: "",
    },
    {
      title: t("totalRevenue"),
      value: serviceData?.serviceSummary.totalRevenue || 0,
      unit: "MAD",
    },
    {
      title: t("totalCost"),
      value: serviceData?.serviceSummary.totalCost || 0,
      unit: "MAD",
    },
    {
      title: t("totalProfit"),
      value: serviceData?.serviceSummary.totalProfit || 0,
      unit: "MAD",
    },
  ];

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

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case "airline-ticket":
        return "bg-sky-100 text-sky-700";
      case "hotel-reservation":
        return "bg-amber-100 text-amber-700";
      case "reservation-ticket":
        return "bg-rose-100 text-rose-700";
      case "visa":
        return "bg-teal-100 text-teal-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <button
          onClick={() => navigate("/employees")}
          className={`p-2 bg-gray-100 rounded-full hover:bg-gray-200 ${
            document.documentElement.dir === "rtl" ? "ml-4" : "mr-4"
          }`}
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("employeeAnalysis", { username: employee.username })}
          </h1>
          <p className="text-gray-600 mt-2">
            {t("performanceOverview", { username: employee.username })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {card.value}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PerformanceCard
          title="overallProgramPerformance"
          dateFilter={programDateFilter}
          setDateFilter={setProgramDateFilter}
          customDateRange={programCustomDate}
          setCustomDateRange={setProgramCustomDate}
          summaryData={programSummaryMetrics}
          isLoading={isLoadingProgramData}
        />
        <PerformanceCard
          title="overallServicePerformance"
          dateFilter={serviceDateFilter}
          setDateFilter={setServiceDateFilter}
          customDateRange={serviceCustomDate}
          setCustomDateRange={setServiceCustomDate}
          summaryData={serviceSummaryMetrics}
          isLoading={isLoadingServiceData}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
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
                  {t("programName")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("programType")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("bookings")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalSales")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalCost")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalProfit")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingProgramData ? (
                <tr>
                  <td colSpan={6} className="text-center p-4">
                    Loading...
                  </td>
                </tr>
              ) : (
                programData?.programPerformance.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.programName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.bookingCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalSales.toLocaleString()} MAD
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.totalCost.toLocaleString()} MAD
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                      {item.totalProfit.toLocaleString()} MAD
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
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
                  {t("serviceType")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("serviceCount")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalSales")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalCost")}
                </th>
                <th
                  className={`px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    document.documentElement.dir === "rtl"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {t("totalProfit")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingServiceData ? (
                <tr>
                  <td colSpan={5} className="text-center p-4">
                    Loading...
                  </td>
                </tr>
              ) : (
                serviceData?.dailyServicePerformance.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getServiceTypeColor(
                          item.type
                        )}`}
                      >
                        {t(item.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.serviceCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalSales.toLocaleString()} MAD
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.totalCost.toLocaleString()} MAD
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                      {item.totalProfit.toLocaleString()} MAD
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
