import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Users,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { subDays, startOfDay, endOfDay, format, subYears } from "date-fns";
import * as api from "../services/api";
import { Link } from "react-router-dom";
import type { Booking, DashboardStats } from "../context/models";
import DashboardSkeleton from "../components/skeletons/DashboardSkeleton";
import { useAuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { t } = useTranslation();
  const { state } = useAuthContext();
  const userRole = state.user?.role;

  const [dateFilter, setDateFilter] = useState("month");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  const dateRangeParams = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (dateFilter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "month":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "year":
        startDate = startOfDay(subYears(now, 1));
        break;
      case "custom":
        if (customDateRange.start && customDateRange.end) {
          return {
            startDate: customDateRange.start,
            endDate: customDateRange.end,
          };
        }
        return { startDate: undefined, endDate: undefined };
      case "7days":
      default:
        startDate = startOfDay(subDays(now, 7));
        break;
    }
    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [dateFilter, customDateRange]);

  const {
    data: dashboardData,
    isLoading,
    isError,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats", dateRangeParams],
    queryFn: () =>
      api.getDashboardStats(dateRangeParams.startDate, dateRangeParams.endDate),
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !dashboardData) {
    return <div>{t("errorLoadingDashboard")}</div>;
  }

  const {
    allTimeStats,
    dateFilteredStats,
    dailyServiceProfitData,
    paymentStatus,
    recentBookings,
  } = dashboardData;

  const topStats = [
    {
      title: t("totalBookings"),
      value: allTimeStats.totalBookings,
      icon: Users,
      color: "bg-blue-500",
      roles: ["admin", "manager", "employee"],
    },
    {
      title: t("totalRevenue"),
      value: `${allTimeStats.totalRevenue.toLocaleString()} ${t("mad")}`,
      icon: DollarSign,
      color: "bg-emerald-500",
      roles: ["admin"],
    },
    {
      title: t("totalProfit"),
      value: `${allTimeStats.totalProfit.toLocaleString()} ${t("mad")}`,
      icon: TrendingUp,
      color: "bg-orange-500",
      roles: ["admin"],
    },
    {
      title: t("activePrograms"),
      value: allTimeStats.activePrograms,
      icon: Package,
      color: "bg-purple-500",
      roles: ["admin", "manager", "employee"],
    },
  ];

  const visibleTopStats = topStats.filter((stat) =>
    stat.roles.includes(userRole || "")
  );

  const adminManagerMetrics = [
    { title: t("totalBookings"), value: dateFilteredStats.totalBookings },
    {
      title: t("totalRevenue"),
      value: `${dateFilteredStats.totalRevenue.toLocaleString()} ${t("mad")}`,
    },
    {
      title: t("totalCosts"),
      value: `${dateFilteredStats.totalCost.toLocaleString()} ${t("mad")}`,
    },
    {
      title: t("totalProfit"),
      value: `${dateFilteredStats.totalProfit.toLocaleString()} ${t("mad")}`,
    },
  ];

  const employeeMetrics = [
    { title: t("totalBookings"), value: dateFilteredStats.totalBookings },
    {
      title: t("totalPaid"),
      value: `${dateFilteredStats.totalPaid.toLocaleString()} ${t("mad")}`,
    },
    {
      title: t("totalRemaining"),
      value: `${dateFilteredStats.totalRemaining.toLocaleString()} ${t("mad")}`,
    },
  ];

  const serviceProfitChartData = (dailyServiceProfitData || []).map((item) => ({
    name: t(item.type),
    value: item.totalProfit,
  }));

  const COLORS = ["#3b82f6", "#059669", "#ea580c", "#8b5cf6"];

  const fullyPaidBookings = paymentStatus.fullyPaid;
  const pendingPayments = paymentStatus.pending;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("dashboard")}</h1>
        <p className="text-gray-600 mt-2">{t("dashboardSubtitle")}</p>
      </div>

      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
          userRole === "employee" || userRole === "manager"
            ? "lg:grid-cols-2"
            : "lg:grid-cols-4"
        }`}
      >
        {visibleTopStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center flex-wrap gap-2">
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
                  onClick={() => setDateFilter("year")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    dateFilter === "year"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t("lastYear")}
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
              <div className="flex items-center space-x-2 mt-4">
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
                    setCustomDateRange({
                      ...customDateRange,
                      end: e.target.value,
                    })
                  }
                  className="px-3 py-1 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>
          <table className="w-full mt-4">
            <tbody>
              {(userRole === "admin"
                ? adminManagerMetrics
                : employeeMetrics
              ).map((metric) => (
                <tr
                  key={metric.title}
                  className="border-b last:border-b-0 border-gray-100"
                >
                  <td className="py-3 text-base font-medium text-gray-600">
                    {metric.title}
                  </td>
                  <td className="py-3 text-2xl font-bold text-gray-900 text-right">
                    {metric.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {t("profitByServiceType")}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceProfitChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {serviceProfitChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) =>
                  `${value.toLocaleString()} ${t("mad")}`
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4">
            {serviceProfitChartData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                  }`}
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("quickActions")}
          </h3>
          <div className="space-y-3">
            <Link
              to="/booking"
              className={`w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors ${
                document.documentElement.dir === "rtl"
                  ? "text-right"
                  : "text-left"
              }`}
            >
              <Calendar className="w-5 h-5 text-blue-500 mx-3" />
              <span className="text-sm font-medium text-gray-700">
                {t("newBooking")}
              </span>
            </Link>
            <Link
              to="/programs"
              className={`w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors ${
                document.documentElement.dir === "rtl"
                  ? "text-right"
                  : "text-left"
              }`}
            >
              <Package className="w-5 h-5 text-emerald-500 mx-3" />
              <span className="text-sm font-medium text-gray-700">
                {t("addProgram")}
              </span>
            </Link>
            {(userRole === "admin" || userRole === "manager") && (
              <Link
                to="/profit-report"
                className={`w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                <TrendingUp className="w-5 h-5 text-orange-500 mx-3" />
                <span className="text-sm font-medium text-gray-700">
                  {t("viewReports")}
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("paymentStatus")}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle2
                  className={`w-5 h-5 text-emerald-500 ${
                    document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                  }`}
                />
                <span className="text-sm text-gray-600">{t("fullyPaid")}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {fullyPaidBookings}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Clock
                  className={`w-5 h-5 text-orange-500 ${
                    document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                  }`}
                />
                <span className="text-sm text-gray-600">{t("pending")}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {pendingPayments}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("recentBookings")}
          </h3>
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {booking.clientNameFr}
                  </p>
                  <p className="text-xs text-gray-500">
                    {booking.passportNumber}
                  </p>
                </div>
                <div
                  className={`${
                    document.documentElement.dir === "rtl"
                      ? "text-left"
                      : "text-right"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(booking.sellingPrice).toLocaleString()} {t("mad")}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      booking.isFullyPaid
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {booking.isFullyPaid ? t("paid") : t("pending")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
