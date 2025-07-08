import React, { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-[1366px] mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
