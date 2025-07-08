// frontend/src/pages/Settings.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../services/api";
import { FacturationSettings } from "../context/models";
import { toast } from "react-hot-toast";
import { Save } from "lucide-react";

export default function Settings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FacturationSettings>({});

  const { data: initialSettings, isLoading } = useQuery<FacturationSettings>({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: (data: FacturationSettings) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Settings saved successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settings);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t("settingsTitle")}
        </h1>
        <p className="text-gray-600 mt-2">{t("settingsSubtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-sm border"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {t("facturationSettings")}
        </h2>

        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-700 border-b pb-2">
            {t("companyInfo")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("ice")}
              </label>
              <input
                type="text"
                name="ice"
                value={settings.ice || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("if")}
              </label>
              <input
                type="text"
                name="if"
                value={settings.if || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("rc")}
              </label>
              <input
                type="text"
                name="rc"
                value={settings.rc || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("patente")}
              </label>
              <input
                type="text"
                name="patente"
                value={settings.patente || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("cnss")}
              </label>
              <input
                type="text"
                name="cnss"
                value={settings.cnss || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("address")}
              </label>
              <input
                type="text"
                name="address"
                value={settings.address || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("phone")}
              </label>
              <input
                type="text"
                name="phone"
                value={settings.phone || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("email")}
              </label>
              <input
                type="email"
                name="email"
                value={settings.email || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <h3 className="text-lg font-medium text-gray-700 border-b pb-2 pt-4">
            {t("bankInfo")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("bankName")}
              </label>
              <input
                type="text"
                name="bankName"
                value={settings.bankName || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {t("rib")}
              </label>
              <input
                type="text"
                name="rib"
                value={settings.rib || ""}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm disabled:bg-gray-400"
          >
            <Save
              className={`w-5 h-5 ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />
            {isPending ? t("saving") : t("saveSettings")}
          </button>
        </div>
      </form>
    </div>
  );
}
