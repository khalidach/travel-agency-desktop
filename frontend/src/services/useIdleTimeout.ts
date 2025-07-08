import { useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import * as api from "./api";
import { toast } from "react-hot-toast";

/**
 * A custom hook to manage user session timeout due to inactivity and to periodically refresh the authentication token.
 * @param idleTimeout The duration in milliseconds of inactivity before the user is logged out. Defaults to 1 hour.
 * @param refreshInterval The interval in milliseconds at which to refresh the authentication token to keep the session alive. Defaults to 55 minutes.
 */
const useIdleTimeout = (
  idleTimeout: number = 60 * 60 * 1000, // 1 hour for idle logout
  refreshInterval: number = 55 * 60 * 1000 // 55 minutes for token refresh
) => {
  const { state, dispatch } = useAuthContext();
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  // --- LOGOUT LOGIC ---
  // This function handles the actual logout process.
  const handleLogout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    toast.error("You have been logged out due to inactivity.");
  }, [dispatch]);

  // This function resets the idle timer. It's called whenever there's user activity.
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    idleTimer.current = setTimeout(handleLogout, idleTimeout);
  }, [handleLogout, idleTimeout]);

  // A simple handler that just resets the idle timer.
  const handleActivity = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  // Effect to manage the idle timer based on user activity.
  // It adds and removes event listeners for various user actions.
  useEffect(() => {
    if (state.isAuthenticated) {
      const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
      events.forEach((event) =>
        window.addEventListener(event, handleActivity, { passive: true })
      );

      resetIdleTimer(); // Initial setup of the timer

      // Cleanup function to remove listeners when the component unmounts or user logs out.
      return () => {
        events.forEach((event) =>
          window.removeEventListener(event, handleActivity)
        );
        if (idleTimer.current) {
          clearTimeout(idleTimer.current);
        }
      };
    }
  }, [state.isAuthenticated, handleActivity, resetIdleTimer]);

  // --- TOKEN REFRESH LOGIC ---
  // This function calls the API to refresh the token.
  const refreshToken = useCallback(async () => {
    // No need to refresh if the user is not authenticated.
    if (!state.isAuthenticated) return;
    try {
      const userData = await api.refreshToken();
      dispatch({ type: "REFRESH_TOKEN", payload: userData });
      console.log("Token refreshed successfully to keep session active.");
    } catch (error) {
      console.error("Session has expired, logging out.", error);
      dispatch({ type: "LOGOUT" });
      toast.error("Your session has expired. Please log in again.");
    }
  }, [dispatch, state.isAuthenticated]);

  // Effect to periodically refresh the token to keep the session alive.
  // This runs independently of the idle timer.
  useEffect(() => {
    if (state.isAuthenticated) {
      // Set up an interval to refresh the token. The interval is slightly
      // shorter than the token's expiration time to prevent it from expiring.
      const intervalId = setInterval(refreshToken, refreshInterval);

      // Clean up the interval on logout or component unmount.
      return () => clearInterval(intervalId);
    }
  }, [state.isAuthenticated, refreshToken, refreshInterval]);

  // This hook does not return anything as it only performs side effects.
};

export default useIdleTimeout;
