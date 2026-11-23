import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import API from "../hooks/api";
import useStore from "../stores/ProjectData";

const HToV = () => {
    const [headers, setHeaders] = useState([]);
    const [fixedHeaders, setFixedHeaders] = useState([]);
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("");
    const ProjectId = useStore((state) => state.projectId);
    const [fileExists, setFileExists] = useState(false);
    const url3 = import.meta.env.VITE_API_FILE_URL;
    const fileUrl = `${url3}/uploads/${ProjectId}/Output.xlsx`;
    console.log(fileUrl)
    console.log(fileExists)
    // Handle file upload
    useEffect(() => {
        const checkFile = async () => {
            try {
                const response = await API.get(`/HorizontalToVer/check-file/${ProjectId}`);
                if (response.data.exists) {
                    setFileExists(true);
                } else {
                    setFileExists(false);
                }
            } catch (err) {
                console.error("Error checking file:", err);
            }
        };

        if (ProjectId) checkFile();
    }, [ProjectId]);

    const handleFileUpload = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setFileName(selectedFile.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length > 0) {
                setHeaders(jsonData[0]);
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    // Select or unselect fixed headers
    const handleCheckboxChange = (header) => {
        setFixedHeaders((prev) =>
            prev.includes(header)
                ? prev.filter((h) => h !== header)
                : [...prev, header]
        );
    };

    // Send file + fixed headers to backend
    const handleSendToBackend = async () => {
        if (!file) {
            alert("Please upload an Excel file first.");
            return;
        }

        setIsUploading(true);
        setUploadMessage("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("fixedHeaders", JSON.stringify(fixedHeaders));
            formData.append("ProjectId", ProjectId)
            // 👇 change this to match your actual backend endpoint
            const response = await API.post(
                '/HorizontalToVer/upload-and-process',
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            setUploadMessage(`✅ File uploaded successfully: ${response.data.message || ""}`);
            setFileExists(true);
        } catch (error) {
            console.error(error);
            setUploadMessage("❌ Upload failed. Please check backend logs.");
        } finally {
            setIsUploading(false);
            setFile(null);
            setFileName("");
            setHeaders([])
        }
    };

    return (
        <div
            style={{
                maxWidth: "800px",
                margin: "40px auto",
                backgroundColor: "#fff",
                borderRadius: "16px",
                padding: "40px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                fontFamily: "Inter, system-ui, sans-serif",
            }}
        >
            <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>
                Upload file and select fixed headers.
            </p>

            {/* File Upload Section */}
            <div
                style={{
                    border: "2px dashed #6c63ff",
                    borderRadius: "12px",
                    padding: "40px",
                    textAlign: "center",
                    backgroundColor: "#f9f9ff",
                    cursor: "pointer",
                    transition: "all 0.2s",
                }}
                onClick={() => document.getElementById("excelInput").click()}
            >
                <input
                    id="excelInput"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                />
                <div style={{ fontSize: "1rem", color: "#444" }}>
                    {fileName ? (
                        <strong>📄 {fileName}</strong>
                    ) : (
                        <>
                            <strong>Click to Upload</strong> or drag & drop your Excel file
                        </>
                    )}
                </div>
            </div>

            {/* Header Selection */}
            {headers.length > 0 && (
                <div style={{ marginTop: "40px" }}>
                    <h3 style={{ marginBottom: "10px", textAlign: "center" }}>
                        Headers Found
                    </h3>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: "12px",
                            marginTop: "20px",
                        }}
                    >
                        {headers.map((header, i) => (
                            <div
                                key={i}
                                onClick={() => handleCheckboxChange(header)}
                                style={{
                                    padding: "12px",
                                    borderRadius: "10px",
                                    border: "1px solid #ddd",
                                    backgroundColor: fixedHeaders.includes(header)
                                        ? "#e3fcef"
                                        : "#fafafa",
                                    color: fixedHeaders.includes(header) ? "#007b55" : "#333",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={fixedHeaders.includes(header)}
                                    readOnly
                                    style={{ marginRight: "8px" }}
                                />
                                {header}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            {headers.length > 0 && (
                <div style={{ textAlign: "center", marginTop: "40px" }}>
                    <button
                        onClick={handleSendToBackend}
                        disabled={isUploading}
                        style={{
                            backgroundColor: "#6c63ff",
                            color: "#fff",
                            border: "none",
                            padding: "12px 24px",
                            borderRadius: "8px",
                            fontSize: "1rem",
                            cursor: "pointer",
                            transition: "0.3s",
                        }}
                    >
                        {isUploading ? "Uploading..." : "Upload File"}
                    </button>

                    {uploadMessage && (
                        <p style={{ marginTop: "20px", color: "#333" }}>{uploadMessage}</p>
                    )}
                  
                </div>
                
            )}
              {fileExists && (
                        <div style={{ textAlign: "center", marginTop: "30px" }}>
                            <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                                <button
                                    style={{
                                        backgroundColor: "#28a745",
                                        color: "#fff",
                                        padding: "10px 20px",
                                        borderRadius: "8px",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    ⬇️ Download Processed File
                                </button>
                            </a>
                        </div>
                    )}
        </div>
    );
};

export default HToV;
