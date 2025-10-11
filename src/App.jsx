import React, { useState, useEffect, use } from "react";
import { HashRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import Login from "./Login";
import Dashboard from "./Dashboard";
import CorrectionTool from "./components/CorrectionTool";
import ExcelUpload from "./components/ExcelUpload";
import MainLayout from "./components/MainLayout";
import axios from "axios";
import {jwtDecode} from "jwt-decode";
import { ToastProvider } from './services/notification/ToastProvider';
import ProjectConfiguration from "./ProjectConfig/ProjectConfiguration";
import DataImport from "./ToolsProcessing/DataImport";
import DuplicateTool from "./ToolsProcessing/DuplicateTool";
import Master from "./Masters/Master";
import EnvelopeBreaking from "./ToolsProcessing/Envelope/EnvelopeBreaking";
import ProcessingPipeline from "./ToolsProcessing/ProcessingPipeline";
import Report from "./pages/Report/Report";
import ProjectDashboard from "./components/ProjectDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import { useUserToken, useUserTokenActions } from "./stores/UserToken";

function isTokenExpired(token) {
  console.log('checking token expiration',token);
  if (!token) return true;
  try {
    console.log("Entering in loop",token)
    const decoded = jwtDecode(token);
    console.log(decoded);
    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}

function TokenChecker() {
  const token = useUserToken();
  const { clearToken } = useUserTokenActions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip expiry check if on login page
    if (location.pathname === "/login") return;

    if (!token) return; // No token, no need to check

    const checkTokenValidity = () => {
      console.log("Checking token validity...");
      if (isTokenExpired(token)) {
        clearToken();
        navigate("/login");
      }
    };

    // Check immediately on mount
    checkTokenValidity();

    // Check every 1 minute
    const intervalId = setInterval(checkTokenValidity, 60000);

    return () => clearInterval(intervalId);
  }, [token, clearToken, navigate, location.pathname]);

  return null;
}
export default function App() {
  const token = useUserToken();

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  return (
    <ToastProvider position="top-right">
      <Router>
        <TokenChecker />
        <Routes>
          <Route
            path="/"
            element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
          />
          <Route path="/login" element={<Login />} />

          {token && (
            <>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/masters"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <Master />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projectconfiguration"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <ProjectConfiguration />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dataimport"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <DataImport />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/duplicate"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <DuplicateTool />
                    </MainLayout></ProtectedRoute>
                }
              />
              <Route
                path="/correctiontool"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <CorrectionTool />
                    </MainLayout></ProtectedRoute>
                }
              />
              <Route
                path="/excelupload"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <ExcelUpload />
                    </MainLayout></ProtectedRoute>
                }
              />

              <Route
                path="/envelopebreaking"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <EnvelopeBreaking />
                    </MainLayout></ProtectedRoute>
                }
              />
              <Route
                path="/processingpipeline"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <ProcessingPipeline />
                    </MainLayout></ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <Report />
                    </MainLayout></ProtectedRoute>
                }
              />
              <Route
                path="/projectdashboard"
                element={
                  <ProtectedRoute token={token}>
                    <MainLayout >
                      <ProjectDashboard />
                    </MainLayout></ProtectedRoute>
                }
              />
            </>
          )}
          <Route
            path="*"
            element={<Navigate to={token ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
