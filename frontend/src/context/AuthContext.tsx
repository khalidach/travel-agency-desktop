// frontend/src/context/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import type { User } from "./models";

// --- STATE AND ACTION TYPES ---
interface AuthState {
  isAuthenticated: boolean;
  isVerified: boolean; // New state to track if the app is verified
  user: User | null;
  loading: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "VERIFY" } // New action for successful verification
  | { type: "LOGOUT" };

// --- INITIAL STATE ---
// Check sessionStorage for both user and verification status
const userFromStorage = sessionStorage.getItem("user");
const verifiedFromStorage = sessionStorage.getItem("isVerified");

const initialUser = userFromStorage ? JSON.parse(userFromStorage) : null;

const initialState: AuthState = {
  loading: false,
  isAuthenticated: !!initialUser,
  isVerified: verifiedFromStorage === "true", // Check if verified
  user: initialUser,
};

// --- REDUCER ---
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN":
      sessionStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case "VERIFY":
      // When verified, set the flag in state and sessionStorage
      sessionStorage.setItem("isVerified", "true");
      return {
        ...state,
        isVerified: true,
      };
    case "LOGOUT":
      // On logout, clear everything including verification status
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("isVerified");
      return {
        ...initialState,
        isAuthenticated: false,
        isVerified: false,
        user: null,
      };
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
