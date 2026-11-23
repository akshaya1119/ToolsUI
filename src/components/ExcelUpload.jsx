import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { useToast } from "../hooks/useToast";
import API from "../hooks/api";

const fieldOptions = ["Type", "Language", "Subject", "Course", "ExamType", "Catch", "PaperNumber"];

export default function ExcelUpload() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mappings, setMappings] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [sheetData, setSheetData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const token = localStorage.getItem("token");
  const [viewData, setViewData] = useState([]);
  const [showViewButton, setShowViewButton] = useState(false);

  //notificaiton
  const { showToast } = useToast();
  const url1 = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    axios.get(`${url1}/Groups`)
      .then(res => {
        console.log(res.data);
        setGroups(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch groups:", err)
      });
  }, []);


  const checkGroupData = async (groupId) => {
    try {
      const res = await API.get(`/ExcelUpload/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.length > 0) {
        setViewData(res.data);
        setShowViewButton(true);
      } else {
        setViewData([]);
        setShowViewButton(false);
      }
    } catch (err) {
      console.error("Failed to load group data:", err);
      setShowViewButton(false);
    }
  };




  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      setHeaders(Object.keys(json[0]));
      setSheetData(json);
      setPreviewData(json.slice(1, 6));
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleMappingChange = (dbField, selectedHeader) => {
    setMappings((prev) => ({ ...prev, [dbField]: selectedHeader }));
  };

  const handleSubmit = async () => {
    if (!sheetData.length) {
      // alert("Please upload a valid Excel file.");
      showToast("Please upload a valid Excel File", "warning");
      return;
    }
    if (!selectedGroupId) {
      // alert("Please select a group.");
      showToast("Please select a group", "warning");
      return;
    }

    const mappedFields = Object.keys(mappings);
    const filteredData = sheetData.map((row) => {
      const obj = {};
      for (const dbField of mappedFields) {
        const excelHeader = mappings[dbField];
        obj[dbField] = String(row[excelHeader] ?? "");
      }
      return obj;
    });

    try {
      await API.post(
        `/ExcelUpload/upload-mapped?groupId=${selectedGroupId}`,
        filteredData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      // alert("Upload successful.");
      showToast("Upload successful", "success");
    } catch (err) {
      console.error(err);
      // alert("Upload failed.");
      showToast("Upload failed", "error");
    }
  };
  
  

  return (
    <div className="p-4 space-y-6">
  <div className="bg-white p-6 rounded-lg shadow space-y-6">
    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
      <i className="ri-upload-cloud-line text-blue-600"></i> Upload Excel File
    </h2>

    {/* Group & Upload Date */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Select Group</label>
        <select
          value={selectedGroupId}
          onChange={(e) => {
            setSelectedGroupId(e.target.value);
            checkGroupData(e.target.value);
          }}
          className="w-full border rounded px-3 py-2 bg-gray-50"
        >
          <option value="">Choose a group...</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Upload Date</label>
        <input
          type="date"
          className="w-full border rounded px-3 py-2 bg-gray-50"
          value={new Date().toISOString().slice(0, 10)}
          readOnly
        />
      </div>
    </div>

    {/* Upload Area */}
    <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-10 text-gray-600">
      <i className="ri-upload-cloud-2-line text-4xl mb-4 text-gray-400"></i>
      <p className="font-medium">Drag & Drop Excel File Here</p>
      <p className="text-sm mb-4 text-gray-500">or</p>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        className="hidden"
        id="fileInput"
      />
      <label
        htmlFor="fileInput"
        className="px-4 py-2 bg-white border rounded cursor-pointer hover:bg-gray-100 flex items-center gap-2"
      >
        <i className="ri-folder-upload-line"></i> Browse Files
      </label>
    </div>

    <button
      onClick={handleSubmit}
      className="w-full py-3 text-white bg-blue-400 rounded font-semibold hover:bg-blue-500 transition"
    >
      <i className="ri-upload-2-line mr-2"></i> Upload File
    </button>
  </div>

  {/* ✅ Header Mapping - unchanged */}
  {headers.length > 0 && (
    <>
      <h2 className="text-xl font-semibold mb-2 text-gray-700">Header Mapping</h2>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
        {fieldOptions.map((field) => (
          <div key={field}>
            <label className="block font-medium mb-1 text-gray-600">{field}</label>
            <select
              className="w-full border px-3 py-2 rounded bg-gray-50"
              value={mappings[field] || ""}
              onChange={(e) => handleMappingChange(field, e.target.value)}
            >
              <option value="">-- Select Header --</option>
              {headers.map((header) => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </>
  )}

  {/* ✅ Preview Table */}
  {headers.length > 0 && (
    <>
      <h2 className="text-xl font-semibold mb-2 text-gray-700">Excel Preview</h2>
      <div className="overflow-auto max-h-60 border rounded bg-gray-50">
        <table className="w-full text-sm text-left">
          <thead className="bg-indigo-100 border-b text-gray-700">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-2">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b hover:bg-indigo-50">
                {headers.map((header) => (
                  <td key={header} className="px-4 py-2">{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}

  {/* ✅ Existing Data */}
  {showViewButton && (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-2 text-gray-700">Existing Data for Selected Group</h2>
      <div className="overflow-auto max-h-80 border rounded bg-gray-50">
        <table className="w-full text-sm text-left">
          <thead className="bg-indigo-100 border-b text-gray-700">
            <tr>
              {fieldOptions.map((field) => (
                <th key={field} className="px-4 py-2 capitalize">{field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viewData.map((row, index) => (
              <tr key={index} className="border-b hover:bg-indigo-50">
                {fieldOptions.map((field) => (
                  <td key={field} className="px-4 py-2">{row[field.toLowerCase()]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {/* ✅ Summary Stats */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
    <div className="bg-white p-6 rounded shadow text-center">
      <p className="text-2xl font-bold text-blue-500">{sheetData.length}</p>
      <p className="text-sm text-gray-500">Total Records</p>
    </div>
    <div className="bg-white p-6 rounded shadow text-center">
      <p className="text-2xl font-bold text-green-500">{groups.length}</p>
      <p className="text-sm text-gray-500">Available Groups</p>
    </div>
  </div>
</div>

  );
}
