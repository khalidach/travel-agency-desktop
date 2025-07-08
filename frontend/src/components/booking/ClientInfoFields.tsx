// frontend/src/components/booking/ClientInfoFields.tsx
import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

const ClientInfoFields = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("clientNameFr")}
          </label>
          <Controller
            name="clientNameFr"
            control={control}
            rules={{ required: t("clientNameFrRequired") as string }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          />
          {errors.clientNameFr && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.clientNameFr as any).message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("clientNameAr")}
          </label>
          <Controller
            name="clientNameAr"
            control={control}
            rules={{ required: t("clientNameArRequired") as string }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                dir="rtl"
              />
            )}
          />
          {errors.clientNameAr && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.clientNameAr as any).message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("personType")}
          </label>
          <Controller
            name="personType"
            control={control}
            rules={{ required: t("personTypeRequired") as string }}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="adult">{t("adult")}</option>
                <option value="child">{t("child")}</option>
                <option value="infant">{t("infant")}</option>
              </select>
            )}
          />
          {errors.personType && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.personType as any).message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("passportNumber")}
          </label>
          <Controller
            name="passportNumber"
            control={control}
            rules={{ required: t("passportNumberRequired") as string }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          />
          {errors.passportNumber && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.passportNumber as any).message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("phoneNumber")}
          </label>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.phoneNumber as any).message}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ClientInfoFields;
