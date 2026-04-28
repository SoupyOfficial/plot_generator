// src/components/__tests__/stageFlow.test.jsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StageFlow } from "../stageFlow.jsx";

describe("StageFlow", () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {
      getStage: vi.fn().mockResolvedValue(null),
      saveStage: vi.fn().mockResolvedValue(undefined),
      getCanon: vi.fn().mockResolvedValue(null),
      listCandidates: vi.fn().mockResolvedValue([]),
      listProjects: vi.fn().mockResolvedValue([
        { id: "test-project", name: "Test Project", createdAt: Date.now() }
      ]),
      getProject: vi.fn().mockResolvedValue({ id: "test-project", name: "Test Project", createdAt: Date.now() }),
    };
  });

  it("renders the shell with project bar, stage rail, and main panel", async () => {
    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={null}
      />
    );

    // Project bar should show project picker
    // Wait for project list to load
    await waitFor(() => {
      expect(mockStorage.listProjects).toHaveBeenCalled();
    });

    // Stage rail should show all 6 stages
    expect(screen.getByText("L1")).toBeInTheDocument();
    expect(screen.getByText("L2")).toBeInTheDocument();
    expect(screen.getByText("L3")).toBeInTheDocument();
    expect(screen.getByText("L4")).toBeInTheDocument();
    expect(screen.getByText("L5")).toBeInTheDocument();
    expect(screen.getByText("L6")).toBeInTheDocument();

    // Main panel should show L1 (default stage) header
    expect(screen.getByText("L1 · Seed")).toBeInTheDocument();
  });

  it("switches stages when clicking stage buttons", async () => {
    const renderStage = vi.fn(() => <div>Stage content</div>);

    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={renderStage}
      />
    );

    // Click L2 button
    const l2Button = screen.getByText("L2").closest("button");
    fireEvent.click(l2Button);

    // Main panel should update to L2
    await waitFor(() => {
      expect(screen.getByText("L2 · Promise")).toBeInTheDocument();
    });

    // renderStage should be called with "l2"
    expect(renderStage).toHaveBeenCalledWith(
      "l2",
      expect.objectContaining({
        storage: mockStorage,
        projectId: "test-project",
      })
    );
  });

  it("toggles drawer when clicking inspect button", () => {
    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={null}
      />
    );

    // Drawer should be closed initially
    expect(screen.queryByText("CANON")).not.toBeInTheDocument();

    // Click inspect button
    const inspectButton = screen.getByText(/INSPECT/).closest("button");
    fireEvent.click(inspectButton);

    // Drawer should open
    expect(screen.getByText("CANON")).toBeInTheDocument();
    expect(screen.getByText("AUDIT")).toBeInTheDocument();
    expect(screen.getByText("HISTORY")).toBeInTheDocument();
    expect(screen.getByText("RAW")).toBeInTheDocument();
  });

  it("switches drawer tabs when clicking tab buttons", async () => {
    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={null}
      />
    );

    // Open drawer
    const inspectButton = screen.getByText(/INSPECT/).closest("button");
    fireEvent.click(inspectButton);

    // Click HISTORY tab
    const historyTab = screen.getByText("HISTORY");
    fireEvent.click(historyTab);

    // Should show history empty state
    await waitFor(() => {
      expect(screen.getByText(/No history for this stage yet/)).toBeInTheDocument();
    });
  });

  it("loads stage status from storage on mount", async () => {
    mockStorage.getStage.mockImplementation((projectId, stage) => {
      if (stage === "l1") {
        return Promise.resolve({ locked: true });
      } else if (stage === "l2") {
        return Promise.resolve({ draft: "some draft" });
      }
      return Promise.resolve(null);
    });

    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={null}
      />
    );

    // Should call getStage for all 6 stages
    await waitFor(() => {
      expect(mockStorage.getStage).toHaveBeenCalledTimes(6);
    });

    expect(mockStorage.getStage).toHaveBeenCalledWith("test-project", "l1");
    expect(mockStorage.getStage).toHaveBeenCalledWith("test-project", "l2");
    expect(mockStorage.getStage).toHaveBeenCalledWith("test-project", "l6");
  });

  it("calls onLockStage when provided in renderStage props", async () => {
    const renderStage = vi.fn((stage, props) => {
      return (
        <button onClick={() => props.onLockStage({ artifact: "test" })}>
          Lock Stage
        </button>
      );
    });

    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={renderStage}
      />
    );

    // Click the lock button
    const lockButton = screen.getByText("Lock Stage");
    fireEvent.click(lockButton);

    // Should save stage with locked flag
    await waitFor(() => {
      expect(mockStorage.saveStage).toHaveBeenCalledWith(
        "test-project",
        "l1",
        { artifact: "test" },
        { locked: true }
      );
    });
  });

  it("displays placeholder when no renderStage provided", () => {
    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={null}
      />
    );

    expect(screen.getByText(/Stage content renderer not provided/)).toBeInTheDocument();
  });

  it("handles keyboard shortcuts for stage navigation", async () => {
    const renderStage = vi.fn(() => <div>Stage content</div>);

    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={renderStage}
      />
    );

    // Press "3" key to jump to L3
    fireEvent.keyDown(window, { key: "3" });

    await waitFor(() => {
      expect(screen.getByText("L3 · Short Story")).toBeInTheDocument();
    });

    // Press "5" key to jump to L5
    fireEvent.keyDown(window, { key: "5" });

    await waitFor(() => {
      expect(screen.getByText("L5 · Novel Outline")).toBeInTheDocument();
    });
  });

  it("handles keyboard shortcut for drawer toggle", () => {
    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={null}
      />
    );

    // Drawer should be closed
    expect(screen.queryByText("CANON")).not.toBeInTheDocument();

    // Press "d" key to toggle drawer
    fireEvent.keyDown(window, { key: "d" });

    // Drawer should open
    expect(screen.getByText("CANON")).toBeInTheDocument();

    // Press "d" again to close
    fireEvent.keyDown(window, { key: "d" });

    // Drawer should close
    expect(screen.queryByText("CANON")).not.toBeInTheDocument();
  });

  it("loads canon data when CANON tab is selected", async () => {
    const canonData = {
      premise: "Test premise",
      voice: "Test voice",
    };
    mockStorage.getCanon.mockResolvedValue(canonData);

    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={null}
      />
    );

    // Open drawer (CANON tab is default)
    const inspectButton = screen.getByText(/INSPECT/).closest("button");
    fireEvent.click(inspectButton);

    // Should load canon data
    await waitFor(() => {
      expect(mockStorage.getCanon).toHaveBeenCalledWith("test-project");
    });

    // Should display canon data as JSON
    await waitFor(() => {
      expect(screen.getByText(/Test premise/)).toBeInTheDocument();
    });
  });

  it("loads history data when HISTORY tab is selected", async () => {
    const historyData = [
      { createdAt: new Date().toISOString(), picked: true },
      { createdAt: new Date().toISOString(), picked: false },
    ];
    mockStorage.listCandidates.mockResolvedValue(historyData);

    render(
      <StageFlow
        storage={mockStorage}
        currentProjectId="test-project"
        onProjectChange={vi.fn()}
        renderStage={null}
      />
    );

    // Open drawer
    const inspectButton = screen.getByText(/INSPECT/).closest("button");
    fireEvent.click(inspectButton);

    // Click HISTORY tab
    const historyTab = screen.getByText("HISTORY");
    fireEvent.click(historyTab);

    // Should load candidates
    await waitFor(() => {
      expect(mockStorage.listCandidates).toHaveBeenCalledWith("test-project", "l1");
    });

    // Should display history items
    await waitFor(() => {
      expect(screen.getByText(/Picked/)).toBeInTheDocument();
    });
  });
});
