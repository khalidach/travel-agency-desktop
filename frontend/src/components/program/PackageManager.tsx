import React from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Hotel, Users } from "lucide-react";

// Helper function to get number of guests based on room type
function getGuestsForType(type: string): number {
  switch (type.toLowerCase()) {
    case "double":
      return 2;
    case "triple":
      return 3;
    case "quad":
      return 4;
    case "quintuple":
      return 5;
    default:
      return 1;
  }
}

// Sub-component for managing hotels within a package
const PackageHotels = ({ packageIndex }: { packageIndex: number }) => {
  const { t } = useTranslation();
  const { watch } = useFormContext();
  const cities = watch("cities");

  return (
    <div className="mb-6">
      <h5 className="text-sm font-medium text-gray-700 mb-3">
        {t("hotelsByCity")}
      </h5>
      <div className="space-y-4">
        {cities
          .filter((c: any) => c.name.trim())
          .map((city: any) => (
            <HotelManager
              key={city.name}
              packageIndex={packageIndex}
              city={city}
            />
          ))}
      </div>
    </div>
  );
};

const HotelManager = ({
  packageIndex,
  city,
}: {
  packageIndex: number;
  city: any;
}) => {
  const { t } = useTranslation();
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `packages.${packageIndex}.hotels.${city.name}`,
  });

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 flex items-center">
          <Hotel className={`w-4 h-4 ${document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"}`} />
          {city.name}
        </span>
        <button
          type="button"
          onClick={() => append("")}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {t("addHotel")}
        </button>
      </div>
      <div className="space-y-2">
        {fields.map((field, hotelIndex) => (
          <div key={field.id} className="flex items-center space-x-2">
            <input
              {...register(
                `packages.${packageIndex}.hotels.${city.name}.${hotelIndex}`
              )}
              placeholder={t("hotelNamePlaceholder") as string}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={() => remove(hotelIndex)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-[14px] h-[14px]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main PackageManager Component
export default function PackageManager() {
  const { t } = useTranslation();
  const { control, register, watch } = useFormContext();

  const {
    fields: packageFields,
    append: appendPackage,
    remove: removePackage,
  } = useFieldArray({
    control,
    name: "packages",
  });

  const cities = watch("cities");

  const generateAllHotelOptions = (packageIndex: number) => {
    const pkg = watch(`packages.${packageIndex}`);
    const validCities = cities.filter((city: any) => city.name.trim());
    const options: string[] = [];

    const generateCombinations = (
      cityIndex: number,
      currentCombination: string[]
    ) => {
      if (cityIndex === validCities.length) {
        if (currentCombination.length > 0) {
          options.push(currentCombination.join("_"));
        }
        return;
      }

      const cityHotels =
        (pkg.hotels && pkg.hotels[validCities[cityIndex].name]) || [];
      if (
        cityHotels.length === 0 ||
        cityHotels.every((h: string) => !h.trim())
      ) {
        generateCombinations(cityIndex + 1, currentCombination);
        return;
      }

      cityHotels.forEach((hotel: string) => {
        if (hotel.trim()) {
          generateCombinations(cityIndex + 1, [...currentCombination, hotel]);
        }
      });
    };

    if (validCities.length > 0) {
      generateCombinations(0, []);
    }
    return options;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          {t("packages")}
        </label>
        <button
          type="button"
          onClick={() =>
            appendPackage({
              name: `${t("packageLabel")} ${packageFields.length + 1}`,
              hotels: {},
              prices: [],
            })
          }
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" /> {t("addPackage")}
        </button>
      </div>
      <div className="space-y-6">
        {packageFields.length > 0 ? (
          packageFields.map((pkg, packageIndex) => (
            <div
              key={pkg.id}
              className="border border-gray-200 rounded-xl p-6 bg-gray-50"
            >
              {/* Package Header */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  {t("packageLabel")} {packageIndex + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => removePackage(packageIndex)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Package Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("packageName")}
                </label>
                <input
                  {...register(`packages.${packageIndex}.name`)}
                  placeholder={t("packageNamePlaceholder") as string}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Hotels */}
              <PackageHotels packageIndex={packageIndex} />

              {/* Pricing Structures */}
              <PriceStructureManager
                packageIndex={packageIndex}
                generateAllHotelOptions={generateAllHotelOptions}
              />
            </div>
          ))
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border-dashed border-2 border-gray-300">
            <p className="text-sm text-gray-500">{t("noPackagesAdded")}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t("noPackagesLeadForm")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for pricing structures
const PriceStructureManager = ({
  packageIndex,
  generateAllHotelOptions,
}: {
  packageIndex: number;
  generateAllHotelOptions: (idx: number) => string[];
}) => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const {
    fields: priceFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: `packages.${packageIndex}.prices`,
  });

  const availableRoomTypes = ["Double", "Triple", "Quad", "Quintuple"];

  return (
    <div>
      <h5 className="text-sm font-medium text-gray-700 mb-3">
        {t("hotelCombinationsTitle")}
      </h5>
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {generateAllHotelOptions(packageIndex).map((hotelOption) => (
            <button
              key={hotelOption}
              type="button"
              onClick={() =>
                append({
                  hotelCombination: hotelOption,
                  roomTypes: availableRoomTypes.map((type) => ({
                    type,
                    guests: getGuestsForType(type),
                  })),
                })
              }
              className="px-3 py-1 text-xs rounded-lg border bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
            >
              + {hotelOption.replace(/_/g, " → ")}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {priceFields.map((price, priceIndex) => (
          <div
            key={price.id}
            className="bg-white p-4 rounded-lg border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h6 className="text-sm font-medium text-gray-900 flex items-center">
                <Users className={`w-4 h-4 ${document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"}`} />
                {(price as any).hotelCombination.replace(/_/g, " → ")}
              </h6>
              <button
                type="button"
                onClick={() => remove(priceIndex)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-[16px] h-[16px]" />
              </button>
            </div>
            <RoomTypeManager
              packageIndex={packageIndex}
              priceIndex={priceIndex}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const RoomTypeManager = ({
  packageIndex,
  priceIndex,
}: {
  packageIndex: number;
  priceIndex: number;
}) => {
  const { t } = useTranslation();
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `packages.${packageIndex}.prices.${priceIndex}.roomTypes`,
  });

  return (
    <div className="space-y-3">
      {fields.map((room, roomIndex) => {
        return (
          <div
            key={room.id}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("roomType")}
              </label>
              <input
                {...register(
                  `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.type`
                )}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("guests")}
              </label>
              <input
                type="number"
                {...register(
                  `packages.${packageIndex}.prices.${priceIndex}.roomTypes.${roomIndex}.guests`,
                  { valueAsNumber: true }
                )}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="1"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => remove(roomIndex)}
                className="p-2 text-red-500 hover:bg-red-100 rounded transition-colors ml-auto"
              >
                <Trash2 className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => append({ type: "Custom", guests: 1 })}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        {t("addCustomRoomType")}
      </button>
    </div>
  );
};
