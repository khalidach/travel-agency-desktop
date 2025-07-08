// frontend/src/components/booking/HotelRoomSelection.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import type { Program, Package, PriceStructure } from "../../context/models";

interface HotelRoomSelectionProps {
  selectedProgram: Program | null;
  selectedPackage: Package | null;
  selectedPriceStructure: PriceStructure | null;
  selectedHotel: {
    cities: string[];
    hotelNames: string[];
    roomTypes: string[];
  };
  updateHotelSelection: (cityIndex: number, hotelName: string) => void;
  updateRoomTypeSelection: (cityIndex: number, roomType: string) => void;
}

export default function HotelRoomSelection({
  selectedProgram,
  selectedPackage,
  selectedPriceStructure,
  selectedHotel,
  updateHotelSelection,
  updateRoomTypeSelection,
}: HotelRoomSelectionProps) {
  const { t } = useTranslation();

  if (
    !selectedPackage ||
    !(selectedProgram?.cities || []).some((c) => c.nights > 0)
  ) {
    return null;
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {t("hotelAndRoomSelection")}
      </h3>
      <div className="space-y-4">
        {(selectedProgram?.cities || []).map((city, cityIndex) => (
          <div key={city.name} className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">
              {city.name} ({t("nights_other", { count: city.nights })})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("selectHotel")}
                </label>
                <select
                  value={selectedHotel.hotelNames[cityIndex] || ""}
                  onChange={(e) =>
                    updateHotelSelection(cityIndex, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">{t("selectAHotel")}</option>
                  {(selectedPackage?.hotels[city.name] || []).map(
                    (hotel: string) => (
                      <option key={hotel} value={hotel}>
                        {hotel}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("roomType")}
                </label>
                <select
                  value={selectedHotel.roomTypes[cityIndex] || ""}
                  onChange={(e) =>
                    updateRoomTypeSelection(cityIndex, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={!selectedPriceStructure}
                >
                  <option value="">
                    {t(
                      selectedPriceStructure
                        ? "selectRoomType"
                        : "selectAllHotelsFirst"
                    )}
                  </option>
                  {selectedPriceStructure?.roomTypes.map((rt) => (
                    <option key={rt.type} value={rt.type}>
                      {rt.type} ({t("guests", { count: rt.guests })})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
