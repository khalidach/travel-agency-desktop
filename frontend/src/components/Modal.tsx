import React, { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  level?: number;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  level = 0,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]); // This effect runs whenever the 'isOpen' prop changes
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      className={`fixed inset-0 `}
      style={{ zIndex: 50 + level * 10 }}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
          style={{ zIndex: 50 + level * 10 }}
        />
        <div
          className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} transform transition-all max-h-[90vh] overflow-y-auto`}
          style={{ zIndex: 51 + level * 10 }}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
