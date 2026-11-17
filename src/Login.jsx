import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useToast } from "./hooks/useToast";
import { FiEye, FiEyeOff } from "react-icons/fi";
import API from "./hooks/api";
import { useUserToken, useUserTokenActions } from "./stores/UserToken";
import { motion } from "framer-motion";
import loginImage from "/Maintenance-cuate.png";
import { Spin } from "antd";

export default function Login() {
  const { t } = useTranslation();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const token = useUserToken();
  const { setToken } = useUserTokenActions();

  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }

    // ✅ Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [token, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post(`/UserLogs/login`, {
        userName,
        password,
      });

      const jwtToken = response.data.token;
      setToken(jwtToken);
      axios.defaults.headers.common["Authorization"] = `Bearer ${jwtToken}`;
      navigate("/dashboard");
      showToast(t("login.loginSuccess", "Login successful!"), "success");
    } catch (error) {
      showToast(t("login.loginFailed", "Login failed. Please check your username or password."), "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen w-screen bg-white overflow-hidden">
      {/* Left panel */}
      <div className="hidden sm:flex w-1/2 bg-blue-950 items-center justify-center flex-col p-8">
        <motion.img
          src={loginImage}
          alt="Login Illustration"
          className="max-w-[75%] h-auto object-contain"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        />
        <motion.h1
          className="text-2xl sm:text-3xl font-bold text-white mt-6 text-center leading-snug px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {t("login.tagline", "Automating Accuracy, Simplifying Effort.")}
        </motion.h1>
      </div>

      {/* Right panel */}
      <div className="flex w-full sm:w-1/2 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-blue-800">
            {t("login.title", "Login to ERP Tools")}
          </h2>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("login.username", "Username")}
              </label>
              <input
                type="text"
                placeholder={t("login.usernamePlaceholder", "Enter your username")}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="relative w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("login.password", "Password")}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("login.passwordPlaceholder", "Enter your password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none pr-10"
                required
              />
              <div
                className="absolute inset-y-0 right-3 top-7 flex items-center cursor-pointer text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-md text-lg font-medium transition duration-200 shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 flex items-center justify-center gap-2 ${
                loading
                  ? "bg-blue-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
              }`}
            >
              {loading ? (
                <>
                  <Spin size="small" style={{ color: "white" }} />
                  {t("login.loggingIn", "Logging in...")}
                </>
              ) : (
                t("login.button", "Login")
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
