// frontend/src/pages/VerificationPage.tsx

import React, { useState, useEffect } from "react";
import { ShieldCheck, KeyRound, Plane } from "lucide-react";
import { toast } from "react-hot-toast";

// Define the props for the component, which includes the onVerified callback.
interface VerificationPageProps {
  onVerified: () => void;
}

export default function VerificationPage({
  onVerified,
}: VerificationPageProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [machineId, setMachineId] = useState<string | null>(null);

  // Get the unique machine ID when the component loads
  useEffect(() => {
    const getMachineId = async () => {
      try {
        // Access the API exposed from the preload script
        const id = await window.electronAPI.getMachineId();
        setMachineId(id);
      } catch (error) {
        console.error("Failed to get machine ID:", error);
        toast.error(
          "Could not identify this computer. Please restart the application."
        );
      }
    };
    getMachineId();
  }, []);

  // This function handles the form submission.
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a verification code.");
      return;
    }
    if (!machineId) {
      toast.error(
        "Computer could not be identified. Please restart the application."
      );
      return;
    }

    setIsLoading(true);

    try {
      // The URL for your deployed Netlify function.
      const verificationUrl =
        "https://travel-agency-desktop.netlify.app/api/verify";

      // Send the verification code AND the machine ID to your backend.
      const response = await fetch(verificationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim(), machineId: machineId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Verification failed.");
      }

      toast.success("Verification successful! Welcome.");
      onVerified();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="inline-block p-4 bg-blue-600 rounded-2xl mb-4">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Application Verification
          </h1>
          <p className="text-gray-500 mt-2">
            Please enter your code to activate the software.
          </p>
        </div>
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label
              htmlFor="verification-code"
              className="text-sm font-medium text-gray-700 sr-only"
            >
              Verification Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="w-5 h-5 text-gray-400" />
              </div>
              <input
                id="verification-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your code"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
                disabled={isLoading || !machineId}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || !machineId}
            className="w-full py-3 px-4 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            {isLoading ? "Verifying..." : "Verify and Access"}
          </button>
        </form>
      </div>
    </div>
  );
}
