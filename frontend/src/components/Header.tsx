import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { User, LogOut } from "lucide-react";

export default function Header() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAuthContext();
  const queryClient = useQueryClient(); // Get the query client instance

  const changeLanguage = (lang: "en" | "ar" | "fr") => {
    i18n.changeLanguage(lang);
    if (lang === "ar") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  };

  // Set initial direction based on the current language
  useEffect(() => {
    if (i18n.language === "ar") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  }, [i18n.language]);

  const handleLogout = () => {
    // Clear the React Query cache to remove the previous user's data
    queryClient.clear();
    dispatch({ type: "LOGOUT" });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t("welcomeMessage", { name: state.user?.agencyName || "User" })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t("headerSubtitle")}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <div className="flex items-center gap-x-3 bg-gray-50 rounded-lg p-1">
                <button
                  onClick={() => changeLanguage("fr")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "fr"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  FR
                </button>

                <button
                  onClick={() => changeLanguage("ar")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "ar"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  AR
                </button>
                <button
                  onClick={() => changeLanguage("en")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === "en"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Profile & Logout */}
            <div className="flex items-center gap-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center ring-2 ring-white">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {state.user?.agencyName}
                </p>
                <p className="text-xs text-gray-500">{state.user?.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
