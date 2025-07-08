// frontend/src/components/Sidebar.tsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Package,
  Calendar,
  TrendingUp,
  Plane,
  ShipWheel,
  BedDouble,
  FileText,
  Settings,
  ChevronDown,
  ConciergeBell,
} from "lucide-react";

type MenuItem = {
  key: string;
  path?: string;
  icon: React.ElementType;
  children?: MenuItem[];
};

// Simplified menu for the desktop version
const allMenuItems: MenuItem[] = [
  {
    key: "dashboard",
    path: "/",
    icon: BarChart3,
  },
  {
    key: "gestionPrograms",
    icon: Package,
    children: [
      {
        key: "programs",
        path: "/programs",
        icon: Package,
      },
      {
        key: "programPricing",
        path: "/program-pricing",
        icon: ShipWheel,
      },
      {
        key: "booking",
        path: "/booking",
        icon: Calendar,
      },
      {
        key: "roomManagement",
        path: "/room-management",
        icon: BedDouble,
      },
      {
        key: "profitReport",
        path: "/profit-report",
        icon: TrendingUp,
      },
    ],
  },
  {
    key: "dailyServices",
    icon: ConciergeBell,
    children: [
      {
        key: "manageDailyServices",
        path: "/daily-services",
        icon: ConciergeBell,
      },
      {
        key: "dailyServiceReport",
        path: "/daily-services-report",
        icon: TrendingUp,
      },
    ],
  },
  {
    key: "facturation",
    path: "/facturation",
    icon: FileText,
  },
  {
    key: "settings",
    path: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    const activeParent = allMenuItems.find((item) =>
      item.children?.some((child) => location.pathname.startsWith(child.path!))
    );
    if (activeParent) {
      setOpenMenu(activeParent.key);
    }
  }, [location.pathname]);

  const handleMenuClick = (key: string) => {
    setOpenMenu(openMenu === key ? null : key);
  };

  return (
    <div className="w-64 bg-white shadow-xl border-r border-gray-100 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">TravelPro</h1>
            <p className="text-sm text-gray-500">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {allMenuItems.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              const isParentActive = item.children.some((child) =>
                location.pathname.startsWith(child.path!)
              );
              const isOpen = openMenu === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => handleMenuClick(item.key)}
                    className={`group flex items-center justify-between w-full px-1 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isParentActive && !isOpen
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon
                        className={`mx-3 h-5 w-5 transition-colors ${
                          isParentActive
                            ? "text-blue-600"
                            : "text-gray-400 group-hover:text-gray-600"
                        }`}
                      />
                      {t(item.key)}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                      isOpen ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <ul className="pl-8 pt-2 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = location.pathname.startsWith(
                          child.path!
                        );
                        return (
                          <li key={child.key}>
                            <Link
                              to={child.path!}
                              className={`group flex items-center px-1 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                                isChildActive
                                  ? "text-blue-700 bg-blue-50"
                                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                              }`}
                            >
                              <ChildIcon
                                className={`mr-3 h-4 w-4 transition-colors ${
                                  isChildActive
                                    ? "text-blue-600"
                                    : "text-gray-400 group-hover:text-gray-500"
                                }`}
                              />
                              {t(child.key)}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            }
            const isActive = location.pathname === item.path;
            return (
              <li key={item.key}>
                <Link
                  to={item.path!}
                  className={`group flex items-center px-1 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`mx-3 h-5 w-5 transition-colors ${
                      isActive
                        ? "text-blue-600"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-500 text-center">
          © 2025 TravelPro System
        </div>
      </div>
    </div>
  );
}
