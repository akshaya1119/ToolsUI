import React from "react";
import { Typography, Button, Tabs, Checkbox } from "antd";

const { Text } = Typography;

const DetailPanel = ({
  open,
  selectedModule,
  getConfigForModule,
  detailGrouping,
  setDetailGrouping,
  detailViewType,
  setDetailViewType,
  selectedItems,
  onClose,
  handleGroupToggle,
  handleItemToggle,
  getTotalSelectedCount,
}) => {
  if (!open || !selectedModule) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#999",
        fontSize: "14px"
      }}>
        Select a module to view details
      </div>
    );
  }

  const { moduleName, status, key: moduleKey } = selectedModule;
  const config = getConfigForModule(moduleKey);

  // Mock data structure - replace with actual API data when available
  const mockLotData = {
    "LOT-001": [
      { id: "lot1-1", name: "report1.pdf", url: "#" },
      { id: "lot1-2", name: "report2.pdf", url: "#" },
    ],
    "LOT-002": [
      { id: "lot2-1", name: "report3.pdf", url: "#" },
    ],
  };

  const mockCatchData = {
    "CATCH-A": [
      { id: "catch-a-1", name: "report1.pdf", url: "#" },
    ],
    "CATCH-B": [
      { id: "catch-b-1", name: "report2.pdf", url: "#" },
    ],
  };

  const dataToDisplay = detailGrouping === "lot" ? mockLotData : mockCatchData;
  const totalSelected = getTotalSelectedCount();

  // Render data list with grouping
  const renderDataList = () => (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: "16px"
    }}>
      {Object.entries(dataToDisplay).map(([groupName, items]) => {
        const groupItemIds = items.map(item => item.id);
        const groupSelectedItems = selectedItems[groupName] || [];
        const allSelected = groupItemIds.every(id => groupSelectedItems.includes(id));
        const someSelected = groupSelectedItems.length > 0 && !allSelected;

        return (
          <div key={groupName} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={() => handleGroupToggle(groupName, groupItemIds)}
              />
              <Text strong style={{ fontSize: "13px" }}>
                {groupName}
              </Text>
            </div>
            <div style={{ paddingLeft: 32 }}>
              {items.map((item, idx) => {
                const isSelected = groupSelectedItems.includes(item.id);
                return (
                  <div key={item.id} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: idx < items.length - 1 ? "1px solid #f5f5f5" : "none"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleItemToggle(groupName, item.id)}
                      />
                      <Text style={{ fontSize: "12px" }}>{item.name}</Text>
                    </div>
                    <Button type="link" size="small" style={{ fontSize: "12px" }}>
                      Download
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Tab items for Reports and Templates
  const tabItems = [
    {
      key: "reports",
      label: "Reports",
      children: (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Grouping Toggle */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <Button.Group size="small">
              <Button
                type={detailGrouping === "lot" ? "primary" : "default"}
                onClick={() => setDetailGrouping("lot")}
              >
                Lot-wise
              </Button>
              <Button
                type={detailGrouping === "catch" ? "primary" : "default"}
                onClick={() => setDetailGrouping("catch")}
              >
                Catch-wise
              </Button>
            </Button.Group>

            <Button size="small" type="primary">
              Generate All
            </Button>
          </div>

          {/* Action Buttons */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="small">Download All</Button>
              <Button size="small" disabled={totalSelected === 0}>
                Download Selected ({totalSelected})
              </Button>
            </div>
          </div>

          {/* Data List */}
          {renderDataList()}
        </div>
      ),
    },
    {
      key: "templates",
      label: "Templates",
      children: (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Grouping Toggle */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <Button.Group size="small">
              <Button
                type={detailGrouping === "lot" ? "primary" : "default"}
                onClick={() => setDetailGrouping("lot")}
              >
                Lot-wise
              </Button>
              <Button
                type={detailGrouping === "catch" ? "primary" : "default"}
                onClick={() => setDetailGrouping("catch")}
              >
                Catch-wise
              </Button>
            </Button.Group>
          </div>

          {/* Action Buttons */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="small" type="primary">Generate All</Button>
              <Button size="small">Download All</Button>
              <Button size="small" disabled={totalSelected === 0}>
                Download Selected ({totalSelected})
              </Button>
            </div>
          </div>

          {/* Data List */}
          {renderDataList()}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid #f0f0f0",
        backgroundColor: "#fafafa",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <Text strong style={{ fontSize: "14px" }}>
          {moduleName} Details
        </Text>

        <Button
          type="text"
          size="small"
          onClick={onClose}
        >
          ✕
        </Button>
      </div>

      {/* Tabs for Reports/Templates */}
      <Tabs
        activeKey={detailViewType}
        onChange={setDetailViewType}
        items={tabItems}
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
        tabBarStyle={{ margin: 0, paddingLeft: 16, paddingRight: 16 }}
      />
    </div>
  );
};

export default DetailPanel;
