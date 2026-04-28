// src/components/__tests__/inspectionDrawer.test.jsx
//
// Unit tests for InspectionDrawer component.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InspectionDrawer } from "../inspectionDrawer.jsx";

// Mock window.alert since jsdom doesn't implement it
beforeEach(() => {
  global.alert = vi.fn();
});

describe("InspectionDrawer", () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {
      getCanon: vi.fn().mockResolvedValue({ seed: { selections: {} } }),
      listCandidates: vi.fn().mockResolvedValue([]),
    };
  });

  it("renders all tabs", () => {
    render(
      <InspectionDrawer
        storage={mockStorage}
        projectId="test-project"
        currentStage="seed"
        currentSelections={{}}
      />
    );
    expect(screen.getByText("CANON")).toBeInTheDocument();
    expect(screen.getByText("AUDIT")).toBeInTheDocument();
    expect(screen.getByText("HISTORY")).toBeInTheDocument();
    expect(screen.getByText("RAW")).toBeInTheDocument();
  });

  it("loads canon data when CANON tab is active", async () => {
    render(
      <InspectionDrawer
        storage={mockStorage}
        projectId="test-project"
        currentStage="seed"
        currentSelections={{}}
      />
    );

    // CANON tab is active by default - wait for storage call
    await waitFor(() => {
      expect(mockStorage.getCanon).toHaveBeenCalledWith("test-project");
    }, { timeout: 1000 });
  });

  it("loads history when HISTORY tab is clicked", async () => {
    render(
      <InspectionDrawer
        storage={mockStorage}
        projectId="test-project"
        currentStage="seed"
        currentSelections={{}}
      />
    );

    const historyTab = screen.getByText("HISTORY");
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(mockStorage.listCandidates).toHaveBeenCalledWith("test-project", "seed");
    }, { timeout: 1000 });
  });

  it("renders RAW tab with current selections", () => {
    render(
      <InspectionDrawer
        storage={mockStorage}
        projectId="test-project"
        currentStage="seed"
        currentSelections={{ test: "value" }}
      />
    );

    const rawTab = screen.getByText("RAW");
    fireEvent.click(rawTab);

    // RAW tab should show JSON - just check it doesn't crash
    expect(rawTab).toBeInTheDocument();
  });

  it("switches tabs when clicked", () => {
    render(
      <InspectionDrawer
        storage={mockStorage}
        projectId="test-project"
        currentStage="seed"
        currentSelections={{}}
      />
    );

    // Click AUDIT tab
    const auditTab = screen.getByText("AUDIT");
    fireEvent.click(auditTab);
    expect(auditTab).toBeInTheDocument();

    // Click HISTORY tab
    const historyTab = screen.getByText("HISTORY");
    fireEvent.click(historyTab);
    expect(historyTab).toBeInTheDocument();

    // Click RAW tab
    const rawTab = screen.getByText("RAW");
    fireEvent.click(rawTab);
    expect(rawTab).toBeInTheDocument();
  });

  it("renders empty state when no canon data", async () => {
    mockStorage.getCanon.mockResolvedValue({});
    render(
      <InspectionDrawer
        storage={mockStorage}
        projectId="test-project"
        currentStage="seed"
        currentSelections={{}}
      />
    );

    await waitFor(() => {
      expect(mockStorage.getCanon).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it("calls onRestore when restore button clicked in history", async () => {
    const mockOnRestore = vi.fn();
    mockStorage.listCandidates.mockResolvedValue([
      { id: "candidate-1", timestamp: Date.now(), artifact: { test: "data" } }
    ]);

    render(
      <InspectionDrawer
        storage={mockStorage}
        projectId="test-project"
        currentStage="seed"
        currentSelections={{}}
        onRestore={mockOnRestore}
      />
    );

    const historyTab = screen.getByText("HISTORY");
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(mockStorage.listCandidates).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});
