import React, { useState } from "react";
import { Plane, Lock, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuthContext } from "../context/AuthContext";
import * as api from "../services/api";
import { useMutation } from "@tanstack/react-query";

export default function LoginPage() {
  const { dispatch } = useAuthContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { mutate: loginUser, isPending } = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      api.login(credentials.username, credentials.password),
    onSuccess: (userData) => {
      dispatch({ type: "LOGIN", payload: userData });
      toast.success("Login successful!");
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid credentials.";
      toast.error(errorMessage);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      toast.error("Please enter username and password.");
      return;
    }
    loginUser({ username: trimmedUsername, password });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="inline-block p-4 bg-blue-600 rounded-2xl mb-4">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TravelPro Login</h1>
          <p className="text-gray-500 mt-2">Access your agency dashboard</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 sr-only">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 sr-only">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isPending ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
