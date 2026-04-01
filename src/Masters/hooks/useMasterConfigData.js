import { useState, useEffect, useMemo } from "react";
import API from "../../hooks/api";
import { NODAL_MODULE, UNIVERSITY_MODULE, EXTRA_ALIAS_NAME } from "../../ProjectConfig/components/constants";

export const useMasterConfigData = (token) => {
  const [toolModules, setToolModules] = useState([]);
  const [envelopeOptions, setEnvelopeOptions] = useState([]);
  const [extraTypes, setExtraTypes] = useState([]);
  const [fields, setFields] = useState([]);
  const [extraTypeSelection, setExtraTypeSelection] = useState({});

  // Fetch ExtraTypes
  useEffect(() => {
    API
      .get(`/ExtraTypes`)
      .then((res) => {
        setExtraTypes(res.data);

        // Pre-fill selection with "Fixed"
        const defaults = {};
        res.data.forEach((et) => {
          defaults[et.type] = "Fixed";
        });
        setExtraTypeSelection(defaults);
      })
      .catch((err) => console.error("Failed to fetch extra types", err));
  }, []);

  // Fetch Modules
  useEffect(() => {
    API
      .get(`/Modules`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setToolModules(res.data))
      .catch((err) => console.error("Failed to fetch modules", err));
  }, [token]);

  // Fetch Envelope Types
  useEffect(() => {
    API
      .get(`/EnvelopeTypes`)
      .then((res) => setEnvelopeOptions(res.data))
      .catch((err) => console.error("Failed to fetch envelope types", err));
  }, []);

  // Fetch Fields
  useEffect(() => {
    API
      .get(`/Fields`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setFields(res.data))
      .catch((err) => console.error("Failed to fetch fields", err));
  }, [token]);

  // Build a merged module list with a single Extra Configuration entry
  const mergedModules = useMemo(() => {
    const list = toolModules || [];
    const others = list.filter(
      (m) => m.name !== NODAL_MODULE && m.name !== UNIVERSITY_MODULE
    );

    // Determine description from any one of the original extra modules, if present
    const extraDesc = list.find(
      (m) => m.name === NODAL_MODULE || m.name === UNIVERSITY_MODULE
    )?.description;

    // Insert single alias if at least one extra module exists
    const hasAnyExtra = list.some(
      (m) => m.name === NODAL_MODULE || m.name === UNIVERSITY_MODULE
    );

    return hasAnyExtra
      ? [
          ...others,
          { id: "extra-alias", name: EXTRA_ALIAS_NAME, description: extraDesc },
        ]
      : others;
  }, [toolModules]);

  return {
    toolModules,
    envelopeOptions,
    extraTypes,
    fields,
    mergedModules,
    extraTypeSelection,
    setExtraTypeSelection,
  };
};
