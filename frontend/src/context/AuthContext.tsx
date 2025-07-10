// frontend/src/context/AuthContext.tsx

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import type { User } from "./models";

// --- STATE AND ACTION TYPES ---
interface AuthState {
  isAuthenticated: boolean;
  isVerified: boolean;
  user: User | null;
  loading: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "VERIFY" }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER_DETAILS"; payload: Partial<User> };

// --- INITIAL STATE ---
// Read from localStorage
const userFromStorage = localStorage.getItem("user");
const verifiedFromStorage = localStorage.getItem("isVerified");

const initialUser = userFromStorage ? JSON.parse(userFromStorage) : null;

const initialState: AuthState = {
  loading: false,
  isAuthenticated: !!initialUser,
  isVerified: verifiedFromStorage === "true",
  user: initialUser,
};

// --- REDUCER ---
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
      // Save to localStorage
      localStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case "VERIFY":
      // Save to localStorage
      localStorage.setItem("isVerified", "true");
      return {
        ...state,
        isVerified: true,
      };
    case "LOGOUT":
      // CORRECTED: Remove both user and verification status from localStorage.
      localStorage.removeItem("user");
      localStorage.removeItem("isVerified");
      return {
        ...initialState,
        isAuthenticated: false,
        isVerified: false, // Set isVerified to false
        user: null,
      };
    case "UPDATE_USER_DETAILS":
      if (state.user) {
        const updatedUser = { ...state.user, ...action.payload };
        localStorage.setItem("user", JSON.stringify(updatedUser));
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

// --- CONTEXT AND PROVIDER ---
const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- HOOK ---
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
