// frontend/src/components/booking/ProgramPackageSelection.tsx
import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Program } from "../../context/models";

interface ProgramPackageSelectionProps {
  programs: Program[];
  hasPackages: boolean;
  selectedProgram: Program | null;
  handleProgramChange: (programId: string) => void;
  handlePackageChange: (packageName: string) => void;
  programId?: string;
  booking?: any;
}

const ProgramPackageSelection = ({
  programs,
  hasPackages,
  selectedProgram,
  handleProgramChange,
  handlePackageChange,
  programId,
  booking,
}: ProgramPackageSelectionProps) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("travelProgram")}
        </label>
        <Controller
          name="tripId"
          control={control}
          rules={{ required: t("travelProgramRequired") as string }}
          render={({ field }) => (
            <select
              {...field}
              onChange={(e) => {
                field.onChange(e);
                handleProgramChange(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={!!programId && !booking}
            >
              <option value="">{t("selectAProgram")}</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} ({program.type})
                </option>
              ))}
            </select>
          )}
        />
        {errors.tripId && (
          <p className="text-red-500 text-sm mt-1">
            {(errors.tripId as any).message}
          </p>
        )}
      </div>
      {hasPackages && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("package")}
          </label>
          <Controller
            name="packageId"
            control={control}
            rules={{
              required: hasPackages ? (t("packageRequired") as string) : false,
            }}
            render={({ field }) => (
              <select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  handlePackageChange(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!selectedProgram}
              >
                <option value="">{t("selectAPackage")}</option>
                {(selectedProgram?.packages || []).map((pkg) => (
                  <option key={pkg.name} value={pkg.name}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.packageId && (
            <p className="text-red-500 text-sm mt-1">
              {(errors.packageId as any).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgramPackageSelection;
