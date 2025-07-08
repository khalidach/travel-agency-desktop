import React from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, MapPin } from "lucide-react";

export default function CityManager() {
  const { t } = useTranslation();
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "cities",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          {t("cities")}
        </label>
        <button
          type="button"
          onClick={() => append({ name: "", nights: 0 })}
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className={`w-4 h-4 ${document.documentElement.dir === "rtl" ? "ml-1" : "mr-1"}`} /> {t("addCity")}
        </button>
      </div>
      <div className="space-y-3">
        {fields.map((item, index) => {
          // Safely access the error for the specific city name field
          const nameError =
            Array.isArray(errors.cities) && errors.cities[index]?.name;

          return (
            <div key={item.id}>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <input
                  {...register(`cities.${index}.name`, {
                    required: t("cityNameRequired") as string,
                  })}
                  placeholder={t("enterCityName") as string}
                  className={`flex-1 px-3 py-2 border rounded-lg ${
                    nameError ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <input
                  type="number"
                  {...register(`cities.${index}.nights`, {
                    valueAsNumber: true,
                    min: 0,
                  })}
                  placeholder={t("nights") as string}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {nameError && (
                <p className="text-red-500 text-xs mt-1 ml-6">
                  {nameError.message as string}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
