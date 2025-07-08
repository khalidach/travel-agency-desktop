// frontend/src/components/room/OccupantSearchBox.tsx
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Occupant } from "../../context/models";
import { useDebounce } from "../../hooks/useDebounce";
import { X, ArrowRight } from "lucide-react";
import * as api from "../../services/api";
import { useTranslation } from "react-i18next";

interface OccupantSearchBoxProps {
  programId: string;
  hotelName: string;
  assignedOccupant: Occupant | null;
  assignedIds: Set<number>;
  onAssign: (occupant: Occupant) => void;
  onUnassign: () => void;
  onMove: (occupant: Occupant) => void;
}

export default function OccupantSearchBox({
  programId,
  hotelName,
  assignedOccupant,
  assignedIds,
  onAssign,
  onUnassign,
  onMove,
}: OccupantSearchBoxProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);

  const { data: searchResults = [] } = useQuery<Occupant[]>({
    queryKey: [
      "unassignedOccupantsSearch",
      programId,
      hotelName,
      debouncedSearchTerm,
    ],
    queryFn: () =>
      api.searchUnassignedOccupants(programId, hotelName, debouncedSearchTerm),
    enabled: !!debouncedSearchTerm && showDropdown && !assignedOccupant,
  });

  const finalResults = useMemo(() => {
    // Client-side filter to prevent showing people already assigned in the current view
    return searchResults.filter((occ) => !assignedIds.has(occ.id));
  }, [searchResults, assignedIds]);

  if (assignedOccupant) {
    return (
      <div className="flex items-center justify-between bg-gray-200 p-2 rounded-lg">
        <span className="font-medium text-sm">
          {assignedOccupant.clientName}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(assignedOccupant)}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title={t("move") as string}
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onUnassign}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            title={t("unassign") as string}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={t("searchPlaceholder") as string}
        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
      />
      {showDropdown && finalResults.length > 0 && (
        <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
          {finalResults.map((occ) => (
            <li
              key={occ.id}
              onClick={() => {
                onAssign(occ);
                setSearchTerm("");
                setShowDropdown(false);
              }}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {occ.clientName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
