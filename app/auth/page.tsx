"use client";

import { useState } from "react";
import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";

type AuthMode = "login" | "signup";

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <section className="flex flex-col items-center justify-center px-0 sm:px-4">
      <div className="w-full max-w-sm">
        {/* Tab toggle */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "login"
                ? "border-b-2 border-slate-800 text-slate-800"
                : "text-gray-400 hover:text-gray-600"
            }`}>
            Log in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "border-b-2 border-slate-800 text-slate-800"
                : "text-gray-400 hover:text-gray-600"
            }`}>
            Sign up
          </button>
        </div>

        {/* Form */}
        {mode === "login" ? (
          <LoginForm />
        ) : (
          <SignupForm onSuccess={() => setMode("login")} />
        )}
      </div>
    </section>
  );
};

export default AuthPage;

// "use client";

// import { useState, SubmitEvent } from "react";
// import { useAuth } from "../providers/AuthProvider";
// import { useRouter } from "next/navigation";

// const Login = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [errorMessage, setErrorMessage] = useState("");
//   const { login, user } = useAuth();
//   const router = useRouter();

//   const loginHandler = async (e: SubmitEvent) => {
//     try {
//       e.preventDefault();
//       await login(email, password);
//       router.push("/");
//     } catch (error) {
//       setErrorMessage("Invalid email or password");
//     }
//   };

//   return (
//     <section className="">
//       <h3 className="text-center mb-2">Login form</h3>
//       <form
//         action="submit"
//         onSubmit={(e) => loginHandler(e)}
//         className="border-2 rounded-4xl max-w-1/2">
//         <div className="flex flex-col p-4 px-6">
//           <label htmlFor="email">Email</label>
//           <input
//             type="email"
//             name="email"
//             id="email"
//             value={email}
//             onChange={(e) => setEmail(e.currentTarget.value)}
//             placeholder="Enter your email address"
//           />
//           <label htmlFor="password">Password</label>
//           <input
//             type="password"
//             name="password"
//             id="password"
//             value={password}
//             onChange={(e) => setPassword(e.currentTarget.value)}
//             placeholder="Enter your password"
//           />
//           <p className="text-red-500">{errorMessage}</p>
//           <button
//             type="submit"
//             className="rounded-2xl px-4 p-2 bg-slate-300 text-black mt-2">
//             Login
//           </button>
//         </div>
//       </form>
//     </section>
//   );
// };

// export default Login;
