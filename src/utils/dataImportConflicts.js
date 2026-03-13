const COLLEGE_NAME_KEYS = [
  "CollegeName",
  "College Name",
  "college name",
  "colleage name",
  "colleageName",
  "College",
];

const COLLEGE_CODE_KEYS = [
  "CollegeCode",
  "College Code",
  "college code",
  "colleage code",
  "colleageCode",
  "collegecode",
];

const normalizeText = (value) => String(value ?? "").trim();

const normalizeCode = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (/^\d+$/.test(normalized)) {
    const stripped = normalized.replace(/^0+/, "");
    return stripped || "0";
  }
  return normalized.toUpperCase();
};

const parseNrDatas = (value) => {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const readFromJson = (jsonObject, keys) => {
  for (const key of keys) {
    const value = jsonObject?.[key];
    if (normalizeText(value)) {
      return normalizeText(value);
    }
  }

  const normalizedKeys = new Set(keys.map((key) => key.replace(/\s+/g, "").toLowerCase()));
  const fallbackEntry = Object.entries(jsonObject || {}).find(([key, value]) =>
    normalizedKeys.has(String(key).replace(/\s+/g, "").toLowerCase()) && normalizeText(value)
  );

  return fallbackEntry ? normalizeText(fallbackEntry[1]) : "";
};

const readFromRow = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (normalizeText(value)) {
      return normalizeText(value);
    }
  }

  const normalizedKeys = new Set(keys.map((key) => key.replace(/\s+/g, "").toLowerCase()));
  const fallbackEntry = Object.entries(row || {}).find(([key, value]) =>
    normalizedKeys.has(String(key).replace(/\s+/g, "").toLowerCase()) && normalizeText(value)
  );

  return fallbackEntry ? normalizeText(fallbackEntry[1]) : "";
};

const getCollegeData = (row) => {
  const jsonData = parseNrDatas(row?.NRDatas || row?.nrDatas);
  return {
    collegeName: readFromRow(row, COLLEGE_NAME_KEYS) || readFromJson(jsonData, COLLEGE_NAME_KEYS),
    collegeCode: readFromRow(row, COLLEGE_CODE_KEYS) || readFromJson(jsonData, COLLEGE_CODE_KEYS),
  };
};

const getCatchNo = (row) => normalizeText(row?.CatchNo ?? row?.catchNo);
const getExamDate = (row) => normalizeText(row?.ExamDate ?? row?.examDate);
const getExamTime = (row) => normalizeText(row?.ExamTime ?? row?.examTime);
const getCenterCode = (row) => normalizeText(row?.CenterCode ?? row?.centerCode);
const getNodalCode = (row) => normalizeText(row?.NodalCode ?? row?.nodalCode);
const getNRQuantity = (row) => row?.NRQuantity ?? row?.nrQuantity;

const addConflict = (bucket, conflict) => {
  bucket.push(conflict);
};

const distinctNonEmpty = (values) => [...new Set(values.map(normalizeText).filter(Boolean))];

export const buildFrontendConflictReport = (rows, requiredFieldNames = []) => {
  const conflicts = [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const rowsWithMeta = safeRows.map((row) => ({
    row,
    catchNo: getCatchNo(row),
    examDate: getExamDate(row),
    examTime: getExamTime(row),
    centerCode: getCenterCode(row),
    nodalCode: getNodalCode(row),
    nrQuantity: getNRQuantity(row),
    ...getCollegeData(row),
  }));

  const rowsByCatch = rowsWithMeta
    .filter((item) => item.catchNo)
    .reduce((acc, item) => {
      if (!acc[item.catchNo]) acc[item.catchNo] = [];
      acc[item.catchNo].push(item);
      return acc;
    }, {});

  Object.entries(rowsByCatch).forEach(([catchNo, catchRows]) => {
    const examDates = distinctNonEmpty(catchRows.map((item) => item.examDate));
    const examTimes = distinctNonEmpty(catchRows.map((item) => item.examTime));

    if (examDates.length > 1) {
      addConflict(conflicts, {
        ConflictType: "catch_unique_field",
        CatchNo: catchNo,
        CatchNos: [catchNo],
        UniqueField: "ExamDate",
        ConflictingValues: examDates,
        CanIgnore: true,
        CanResolve: true,
      });
    }

    if (examTimes.length > 1) {
      addConflict(conflicts, {
        ConflictType: "catch_unique_field",
        CatchNo: catchNo,
        CatchNos: [catchNo],
        UniqueField: "ExamTime",
        ConflictingValues: examTimes,
        CanIgnore: true,
        CanResolve: true,
      });
    }
  });

  const centerGroups = rowsWithMeta
    .filter((item) => item.centerCode)
    .reduce((acc, item) => {
      if (!acc[item.centerCode]) acc[item.centerCode] = [];
      acc[item.centerCode].push(item);
      return acc;
    }, {});

  Object.entries(centerGroups).forEach(([centerCode, centerRows]) => {
    const nodalValues = distinctNonEmpty(centerRows.map((item) => item.nodalCode));
    if (nodalValues.length > 1) {
      addConflict(conflicts, {
        ConflictType: "center_multiple_nodals",
        CentreCode: centerCode,
        CatchNos: distinctNonEmpty(centerRows.map((item) => item.catchNo)),
        UniqueField: "NodalCode",
        NodalCodes: nodalValues,
        ConflictingValues: nodalValues,
        CanIgnore: false,
        CanResolve: true,
      });
    }
  });

  const buildCollegeConflicts = (identifierKey, identifierLabel, conflictType, uniqueField, valueKey, valuesPropName) => {
    const grouped = rowsWithMeta
      .filter((item) => item[identifierKey])
      .reduce((acc, item) => {
        const key = item[identifierKey];
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

    Object.entries(grouped).forEach(([identifierValue, groupedRows]) => {
      const values = distinctNonEmpty(groupedRows.map((item) => item[valueKey]));
      if (values.length > 1) {
        addConflict(conflicts, {
          ConflictType: conflictType,
          [identifierLabel]: identifierValue,
          CollegeKeyType: identifierLabel,
          CatchNos: distinctNonEmpty(groupedRows.map((item) => item.catchNo)),
          UniqueField: uniqueField,
          [valuesPropName]: values,
          ConflictingValues: values,
          CanIgnore: false,
          CanResolve: true,
        });
      }
    });
  };

  buildCollegeConflicts("collegeName", "CollegeName", "college_multiple_nodals", "NodalCode", "nodalCode", "NodalCodes");
  buildCollegeConflicts("collegeCode", "CollegeCode", "college_multiple_nodals", "NodalCode", "nodalCode", "NodalCodes");
  buildCollegeConflicts("collegeName", "CollegeName", "college_multiple_centers", "CenterCode", "centerCode", "CenterCodes");
  buildCollegeConflicts("collegeCode", "CollegeCode", "college_multiple_centers", "CenterCode", "centerCode", "CenterCodes");

  requiredFieldNames.forEach((fieldName) => {
    const emptyCatchNos = distinctNonEmpty(
      rowsWithMeta
        .filter((item) => {
          const rawValue = item.row?.[fieldName];
          return normalizeText(rawValue) === "";
        })
        .map((item) => item.catchNo)
    );

    if (emptyCatchNos.length > 0) {
      addConflict(conflicts, {
        ConflictType: "required_field_empty",
        Field: fieldName,
        CatchNos: emptyCatchNos,
        CanIgnore: false,
        CanResolve: true,
      });
    }
  });

  const zeroQuantityCatchNos = distinctNonEmpty(
    rowsWithMeta
      .filter((item) => Number(item.nrQuantity) === 0)
      .map((item) => item.catchNo)
  );

  if (zeroQuantityCatchNos.length > 0) {
    addConflict(conflicts, {
      ConflictType: "zero_nr_quantity",
      Field: "NRQuantity",
      CatchNos: zeroQuantityCatchNos,
      CanIgnore: true,
      CanResolve: false,
    });
  }

  const nodalGroups = rowsWithMeta
    .filter((item) => item.nodalCode)
    .reduce((acc, item) => {
      const normalized = normalizeCode(item.nodalCode);
      if (!normalized) return acc;
      if (!acc[normalized]) acc[normalized] = [];
      acc[normalized].push(item);
      return acc;
    }, {});

  Object.entries(nodalGroups).forEach(([groupKey, groupedRows]) => {
    const variants = distinctNonEmpty(groupedRows.map((item) => item.nodalCode));
    const lengths = [...new Set(variants.map((value) => value.length))];

    if (variants.length > 1 && lengths.length > 1) {
      addConflict(conflicts, {
        ConflictType: "nodal_code_digit_mismatch",
        NodalCodeGroup: groupKey,
        CatchNos: distinctNonEmpty(groupedRows.map((item) => item.catchNo)),
        UniqueField: "NodalCode",
        ConflictingValues: variants,
        CanIgnore: false,
        CanResolve: true,
      });
    }
  });

  return {
    errors: conflicts,
  };
};
