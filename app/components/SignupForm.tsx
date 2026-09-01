"use client";

import { useState } from "react";
import { useAuth } from "../providers/AuthProvider";
import PadelCatcherLoader from "./PadelCatcherLoader";

interface SignupFormProps {
  onSuccess: () => void;
}

const SignupForm = ({ onSuccess }: SignupFormProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password, firstName, lastName);
      onSuccess();
    } catch {
      setErrorMessage("Could not create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && (
        <PadelCatcherLoader overlay label="Creating your account…" />
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="signup-first-name"
            className="text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="signup-first-name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.currentTarget.value)}
            placeholder="Enter your name"
            required
            disabled={isLoading}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="signup-last-name"
            className="text-sm font-medium text-gray-700">
            Surname
          </label>
          <input
            type="text"
            id="signup-last-name"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.currentTarget.value)}
            placeholder="Enter your surname"
            required
            disabled={isLoading}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="signup-email"
            className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="signup-email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="you@example.com"
            required
            disabled={isLoading}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="signup-password"
            className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="signup-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="Create a password"
            required
            disabled={isLoading}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="signup-confirm-password"
            className="text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <input
            type="password"
            id="signup-confirm-password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            placeholder="Repeat your password"
            required
            disabled={isLoading}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-500">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-lg px-4 py-2 bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
          {isLoading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </>
  );
};

export default SignupForm;
