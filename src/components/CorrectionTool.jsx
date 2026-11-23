import React, { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from './../hooks/useToast';
import { RiFilter3Fill, RiListCheck2 } from "react-icons/ri";
import API from "./../hooks/api";
const fieldOptions = ["type", "language", "subject", "course", "examType", "catch", "paperNumber"];

export default function CorrectionTool() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupData, setGroupData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState([]);
  const token = localStorage.getItem("token");
  const { showToast } = useToast();
  const [auditData, setAuditData] = useState([]);
  const [mismatchCount, setMismatchCount] = useState(0);
  const [correctedData, setCorrectedData] = useState({ correctedCount: 0, correctedRows: [] });
  const [editMode, setEditMode] = useState(false);
  const [editableRows, setEditableRows] = useState([]);
  const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [foundCount, setFoundCount] = useState(0);
  const [replacedCount, setReplacedCount] = useState(0);
  const [highlightMatches, setHighlightMatches] = useState([]); // array of {rowId, field}

  const url1 = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    axios.get(`${url1}/Groups`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setGroups(res.data))
      .catch(err => console.error("Failed to fetch groups:", err));
  }, []);

  const fetchGroupData = async (groupId) => {
    setLoading(true);
    try {
      const res = await API.get(`/ExcelUpload/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroupData(res.data);
      setSelectedFields([]); // Reset selections
    } catch (err) {
      console.error("Error fetching group data:", err);
      setGroupData([]);
    }
    setLoading(false);
  };

  const handleSaveChanges = async () => {
    try {
      await API.post(`/Correction/updateRows`, editableRows, {

        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Data updated successfully", "success");
      setEditMode(false);
      await fetchGroupData(selectedGroupId);
    } catch (err) {
      console.error("Failed to update rows", err);
      showToast("Failed to update rows", "error");
    }
  };


  const handleAudit = async () => {
    if (!selectedGroupId) {
      showToast("Please select a group", "warning");
      return;
    }
    try {
      const res = await API.get(`/Correction/audit?groupId=${selectedGroupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditData(res.data.mismatchedRows || []);
      setMismatchCount(res.data.mismatchCount || 0);
      showToast("Audit completed successfully", "success");

    } catch (err) {
      console.error("Audit failed:", err.response?.data || err.message);
      showToast("Audit failed", "error");
      setAuditData([]);
      setMismatchCount(0);
    }
  };

  const handleFieldSelection = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleCorrect = async () => {
    if (!selectedGroupId) {
      // alert("Please select a group.");
      showToast("Please select a group", "warning");
      return;
    }

    if (selectedFields.length === 0) {
      // alert("Please select at least one column to correct.");
      showToast("Please select at least one column to correct", "warning");
      return;
    }

    const payload = {
      groupId: selectedGroupId,
      fieldsToCorrect: selectedFields
    };

    try {
      const res = await API.post(`/Correction/correct`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      setCorrectedData(res.data);
      // alert("Correction completed.");
      showToast("Correction completed", "success");
      await fetchGroupData(selectedGroupId);  // ✅ wait for fresh data
      setAuditData([]);  // ✅ clear old audit highlights
    } catch (err) {
      console.error("Correction failed:", err.response?.data || err.message);
      // alert("Correction failed.");
      showToast("Correction failed.", "error");
    }
  };

  const handleFind = () => {
    if (!findText) {
      showToast("Enter text to find", "warning");
      return;
    }

    let count = 0;
    const highlights = [];

    editableRows.forEach(row => {
      fieldOptions.forEach(field => {
        const value = row[field];
        if (value && value.toString().includes(findText)) {
          count++;
          highlights.push({ rowId: row.id, field });
        }
      });
    });

    setFoundCount(count);
    setHighlightMatches(highlights);
    showToast(`${count} matching values found`, "info");
  };



  const handleFindReplaceAll = () => {
    if (!findText) {
      showToast("Enter text to find", "warning");
      return;
    }

    let replaced = 0;
    const updatedRows = editableRows.map(row => {
      const newRow = { ...row };
      fieldOptions.forEach(field => {
        const value = newRow[field];
        if (value && value.toString().includes(findText)) {
          const replacedValue = value.toString().replaceAll(findText, replaceText);
          if (replacedValue !== value) {
            replaced++;
            newRow[field] = replacedValue;
          }
        }
      });
      return newRow;
    });

    setEditableRows(updatedRows);
    setReplacedCount(replaced);
    setHighlightMatches([]); // clear highlights after replacement
    showToast(`${replaced} values replaced`, "success");
  };



  const displayedRows = showOnlyMismatches
    ? groupData.filter(row => auditData.some(audit => audit.id === row.id))
    : groupData;


  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 flex justify-center items-center text-center gap-2 mb-3.5">
        <i className="ri-upload-cloud-line text-blue-600"></i> Correction Page
      </h2>
      <div className="bg-white p-4 rounded shadow mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left - Group Selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Select Group</label>
          <select
            value={selectedGroupId}
            onChange={(e) => {
              const groupId = e.target.value;
              setSelectedGroupId(groupId);
              setAuditData([]); // ✅ Clear audit highlights on group change
              setMismatchCount(0);
              setCorrectedData(0);
              if (groupId) fetchGroupData(groupId);
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Select Group --</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>

        {/* Middle - Column Selectors */}
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Select Columns for Correction</label>
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-3 rounded">
            {fieldOptions.map((field) => (
              <label key={field} className="flex items-center space-x-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => handleFieldSelection(field)}
                />
                <span className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Right - Action Buttons */}
        <div className="flex items-end space-x-2">
          <button
            onClick={handleCorrect}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold"
          >
            Correct Data
          </button>
          <button
            onClick={() => {
              setSelectedGroupId("");
              setSelectedFields([]);
              setGroupData([]);
            }}
            className="border px-4 py-2 rounded hover:bg-gray-100 text-sm font-semibold"
          >
            Reset
          </button>
        </div>
      </div>


      {/* Data Records Display */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Data Records - {groups.find(g => g.id === selectedGroupId)?.name || 'Group'}</h2>

        {/* Counts */}
        <div className="flex justify-between mb-4">


          <div className="flex flex-wrap gap-2 mb-3 text-sm">
            <span className="px-3 py-1 border rounded">Total: {groupData.length}</span>
            <span className="px-3 py-1 bg-blue-500 text-white rounded">Corrected: {correctedData.correctedCount || 0}</span>
            <span className="px-3 py-1 border rounded">Mismatch: {mismatchCount}</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3 text-sm">

            {/* Add toggle button */}

            <button
              onClick={() => setShowOnlyMismatches(!showOnlyMismatches)}
              className={`px-4 py-2 rounded font-semibold ${showOnlyMismatches
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 hover:bg-gray-400'
                }`}
            >
              {showOnlyMismatches ? (
                <RiListCheck2 className="text-xl" />
              ) : (
                <RiFilter3Fill className="text-xl" />
              )}
            </button>


            <button
              onClick={handleAudit}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-semibold"
            >
              Audit Data
            </button>
            <button
              onClick={async () => {
                if (editMode) {
                  await handleSaveChanges();
                } else {
                  setEditMode(true);
                  setEditableRows(groupData.map(row => ({ ...row })));
                }
              }}
              className={`px-4 py-2 rounded font-semibold ${editMode ? "bg-green-600 text-white hover:bg-green-700" : "bg-yellow-500 text-white hover:bg-yellow-600"
                }`}
            >
              {editMode ? "Save Changes" : "Edit Data"}
            </button>
            {editMode && (
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Find"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="border px-2 py-1 rounded"
                />
                <input
                  type="text"
                  placeholder="Replace"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="border px-2 py-1 rounded"
                />
                <button
                  onClick={handleFind}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Find ({foundCount})
                </button>
                <button
                  onClick={handleFindReplaceAll}
                  className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                >
                  Replace All ({replacedCount})
                </button>
              </div>
            )}


          </div></div>

        {/* Data Table */}
        <div className="overflow-auto rounded border max-h-[500px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20">
              <tr>
                <th className="p-2">#</th>
                {fieldOptions.map((field) => (
                  <th key={field} className="p-2 capitalize">{field}</th>
                ))}
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                <tr><td colSpan={fieldOptions.length + 2} className="text-center p-3 text-gray-400">No Data Found</td></tr>
              ) : (

                displayedRows.map((row, index) => {
                  const auditRow = auditData.find(audit => audit.id === row.id);
                  const mismatches = auditRow?.mismatches || {};

                  const correctedRow = correctedData.correctedRows?.find(item => item.id === row.id);
                  const correctedFields = correctedRow?.changedFields || {}

                  return (
                    <tr key={index} className="border-t">
                      <td className="p-2">{index + 1}</td>
                      {fieldOptions.map((field) => {
                        const dbField = field.charAt(0).toUpperCase() + field.slice(1);
                        const auditMismatch = mismatches[dbField];
                        const corrected = correctedFields[dbField];
                        const isHighlighted = highlightMatches.some(h => h.rowId === row.id && h.field === field);

                        return (
                          <td key={field}
                            className={`p-2 
                              ${auditMismatch ? 'bg-red-100 text-red-600 font-bold' : ''} 
                              ${corrected ? 'bg-yellow-100 text-yellow-800 font-bold' : ''}
                              ${isHighlighted ? 'bg-blue-100 text-blue-800 font-bold' : ''}`}

                            title={corrected ? `Old: ${corrected.old}` : ""}
                          >
                            {editMode ? (
                              <input
                                className="border rounded p-1 w-full"
                                value={editableRows.find(r => r.id === row.id)?.[field] || ""}
                                onChange={(e) =>
                                  setEditableRows(prev =>
                                    prev.map(r => r.id === row.id
                                      ? { ...r, [field]: e.target.value }
                                      : r
                                    )
                                  )
                                }
                              />
                            ) : (
                              <>
                                {row[field] || "-"}
                                {corrected && <div className="text-xs text-gray-600">({corrected.old})</div>}
                              </>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2">
                        {auditRow ? (
                          <span className="text-red-600 font-semibold">Mismatch</span>
                        ) : correctedRow ? (
                          <span className="text-yellow-700 font-semibold">Corrected</span>
                        ) : (
                          <span className="text-green-600 font-semibold">Valid</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>

  );
}
