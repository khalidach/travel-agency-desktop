// frontend/src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import * as api from "../services/api";
import { toast } from "react-hot-toast";
import type { User } from "./models";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "REFRESH_TOKEN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "UPDATE_USER_DETAILS"; payload: { agencyName?: string } };

// Use sessionStorage to ensure session is cleared when the tab is closed.
const userFromStorage = sessionStorage.getItem("user");
const initialUser = userFromStorage ? JSON.parse(userFromStorage) : null;

const initialState: AuthState = {
  loading: false,
  isAuthenticated: !!initialUser,
  user: initialUser,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
    case "REFRESH_TOKEN":
      // Use sessionStorage to store user data for the current session.
      sessionStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case "LOGOUT":
      // Remove user data from sessionStorage on logout.
      sessionStorage.removeItem("user");
      return {
        ...initialState,
        isAuthenticated: false,
        user: null,
        loading: false,
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "UPDATE_USER_DETAILS":
      if (state.user) {
        const updatedUser = { ...state.user, ...action.payload };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        return {
          ...state,
          user: updatedUser,
        };
      }
      return state;
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const handleAuthError = () => {
      dispatch({ type: "LOGOUT" });
      toast.error("Your session has expired. Please log in again.");
    };
    window.addEventListener("auth-error", handleAuthError);
    return () => window.removeEventListener("auth-error", handleAuthError);
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
