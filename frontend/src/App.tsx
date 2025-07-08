// frontend/src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./services/i18n";
import { Toaster } from "react-hot-toast";
import React, { Suspense, lazy, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

import { AuthProvider, useAuthContext } from "./context/AuthContext";
import Layout from "./components/Layout";
import useIdleTimeout from "./services/useIdleTimeout";
import BookingSkeleton from "./components/skeletons/BookingSkeleton";
import * as api from "./services/api";

// Lazy load the page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Programs = lazy(() => import("./pages/Programs"));
const Booking = lazy(() => import("./pages/Booking"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const ProfitReport = lazy(() => import("./pages/ProfitReport"));
const ProgramPricing = lazy(() => import("./pages/ProgramPricing"));
const RoomManagementPage = lazy(() => import("./pages/RoomManagementPage"));
const RoomManage = lazy(() => import("./pages/RoomManage"));
const Facturation = lazy(() => import("./pages/Facturation"));
const Settings = lazy(() => import("./pages/Settings"));
const DailyServices = lazy(() => import("./pages/DailyServices"));
const DailyServiceReport = lazy(() => import("./pages/DailyServiceReport"));

function AppContent() {
  const { state, dispatch } = useAuthContext();

  // This mutation will automatically log in the user when the app starts.
  const { mutate: autoLogin, isPending: isLoggingIn } = useMutation({
    mutationFn: () => api.login(), // No username/password needed
    onSuccess: (userData) => {
      dispatch({ type: "LOGIN", payload: userData });
    },
    onError: (error) => {
      console.error("Auto-login failed:", error);
      // You could show an error message to the user here
    },
  });

  // Run the auto-login only once when the component mounts
  useEffect(() => {
    if (!state.isAuthenticated) {
      autoLogin();
    }
  }, [autoLogin, state.isAuthenticated]);

  useIdleTimeout();

  // Show a loading screen while auto-login is in progress
  if (isLoggingIn || !state.isAuthenticated) {
    return <BookingSkeleton />;
  }

  // Once authenticated, show the main application layout
  return (
    <Layout>
      <Suspense fallback={<BookingSkeleton />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/daily-services" element={<DailyServices />} />
          <Route
            path="/daily-services-report"
            element={<DailyServiceReport />}
          />
          <Route path="/facturation" element={<Facturation />} />
          <Route path="/program-pricing" element={<ProgramPricing />} />
          <Route path="/room-management" element={<RoomManagementPage />} />
          <Route
            path="/room-management/program/:programId"
            element={<RoomManage />}
          />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking/program/:programId" element={<BookingPage />} />
          <Route path="/profit-report" element={<ProfitReport />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;
