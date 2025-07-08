// frontend/src/components/booking/RelatedPeopleManager.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { Booking, RelatedPerson } from "../../context/models";

interface RelatedPeopleManagerProps {
  search: string;
  showDropdown: boolean;
  selectedProgram: any;
  availablePeople: Booking[];
  relatedPersons: RelatedPerson[];
  onSearchChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onAddPerson: (person: Booking) => void;
  onRemovePerson: (personId: number) => void;
}

const RelatedPeopleManager = ({
  search,
  showDropdown,
  selectedProgram,
  availablePeople,
  relatedPersons,
  onSearchChange,
  onFocus,
  onBlur,
  onAddPerson,
  onRemovePerson,
}: RelatedPeopleManagerProps) => {
  const { t } = useTranslation();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {t("relatedPeople")}
      </label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={
            selectedProgram
              ? (t("searchClientToAdd") as string)
              : (t("selectProgramFirst") as string)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={!selectedProgram}
        />
        {showDropdown && availablePeople.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto">
            {availablePeople.map((person) => (
              <li
                key={person.id}
                onClick={() => onAddPerson(person)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {person.clientNameFr} ({person.passportNumber})
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(relatedPersons || []).map((person) => (
          <div
            key={person.ID}
            className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
          >
            <span>{person.clientName}</span>
            <button
              type="button"
              onClick={() => onRemovePerson(person.ID)}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedPeopleManager;
