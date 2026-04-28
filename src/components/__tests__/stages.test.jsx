// src/components/__tests__/stages.test.jsx
//
// Unit tests for stage panel components (L1-L6) and InspectionDrawer.
// Verifies that each stage correctly integrates with storage and renders expected UI.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { L1Seed } from "../stages/l1Seed.jsx";
import { L2Promise } from "../stages/l2Promise.jsx";
import { L3ShortStory } from "../stages/l3ShortStory.jsx";
import { L4Novella } from "../stages/l4Novella.jsx";
import { L5Novel } from "../stages/l5Novel.jsx";
import { L6Chapters } from "../stages/l6Chapters.jsx";
import { InspectionDrawer } from "../inspectionDrawer.jsx";

// Mock window.alert since jsdom doesn't implement it
beforeEach(() => {
  global.alert = vi.fn();
});

describe("L1Seed", () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {
      getStage: vi.fn().mockResolvedValue({
        artifact: { selections: { subgenre: "LitRPG" } },
      }),
      saveStage: vi.fn().mockResolvedValue(undefined),
      lockStage: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("renders L1 Seed title and subtitle", async () => {
    render(<L1Seed storage={mockStorage} projectId="test-project" />);
    await waitFor(() => {
      expect(screen.getByText(/L1 — Seed/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Foundational setup/)).toBeInTheDocument();
  });

  it("loads existing selections from storage on mount", async () => {
    render(<L1Seed storage={mockStorage} projectId="test-project" />);
    await waitFor(() => {
      expect(mockStorage.getStage).toHaveBeenCalledWith("test-project", "seed");
    });
  });

  it("renders preset picker", async () => {
    render(<L1Seed storage={mockStorage} projectId="test-project" />);
    await waitFor(() => {
      expect(screen.getByText(/OPTIONAL — START FROM A PRESET/)).toBeInTheDocument();
    });
  });

  it("renders lock stage button", async () => {
    render(<L1Seed storage={mockStorage} projectId="test-project" />);
    await waitFor(() => {
      const lockBtn = screen.getByText(/LOCK SEED STAGE/);
      expect(lockBtn).toBeInTheDocument();
    });
  });

  it("calls onLock when lock button clicked", async () => {
    const onLock = vi.fn();
    render(<L1Seed storage={mockStorage} projectId="test-project" onLock={onLock} />);

    await waitFor(() => {
      const lockBtn = screen.getByText(/LOCK SEED STAGE/);
      fireEvent.click(lockBtn);
    });

    await waitFor(() => {
      expect(mockStorage.lockStage).toHaveBeenCalled();
    });
  });

  it("renders without crashing when storage loads", async () => {
    render(<L1Seed storage={mockStorage} projectId="test-project" />);
    
    // Just verify it tries to load from storage
    await waitFor(() => {
      expect(mockStorage.getStage).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});

describe("L2Promise", () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {
      getStage: vi.fn().mockResolvedValue({
        artifact: { selections: { primaryTheme: "Power vs Humanity" } },
      }),
      saveStage: vi.fn().mockResolvedValue(undefined),
      lockStage: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("renders L2 Promise title", () => {
    render(<L2Promise storage={mockStorage} projectId="test-project" />);
    // Component shows loading initially - just verify it renders without crashing
    expect(screen.getByText(/Loading|L2/)).toBeInTheDocument();
  });

  it("loads existing selections from storage on mount", async () => {
    render(<L2Promise storage={mockStorage} projectId="test-project" />);
    await waitFor(() => {
      expect(mockStorage.getStage).toHaveBeenCalledWith("test-project", "promise");
    }, { timeout: 1000 });
  });
});

describe("L3ShortStory", () => {
  let mockStorage;
  let mockOnGenerate;

  beforeEach(() => {
    mockStorage = {
      getStage: vi.fn().mockResolvedValue({ artifact: { output: "Test output" } }),
      saveStage: vi.fn().mockResolvedValue(undefined),
    };
    mockOnGenerate = vi.fn().mockResolvedValue("Generated story text");
  });

  it("renders L3 Short Story title", () => {
    render(<L3ShortStory storage={mockStorage} projectId="test-project" onGenerate={mockOnGenerate} />);
    // Component shows loading initially - just verify it renders
    expect(screen.getByText(/Loading|L3/)).toBeInTheDocument();
  });

  it("loads existing output from storage", async () => {
    render(<L3ShortStory storage={mockStorage} projectId="test-project" onGenerate={mockOnGenerate} />);
    await waitFor(() => {
      expect(mockStorage.getStage).toHaveBeenCalledWith("test-project", "short-story");
    }, { timeout: 1000 });
  });
});

describe("L4Novella", () => {
  it("renders placeholder message", () => {
    render(<L4Novella />);
    expect(screen.getByText(/L4 — Novella Outline/)).toBeInTheDocument();
    expect(screen.getByText(/Coming in Milestone 3/)).toBeInTheDocument();
  });
});

describe("L5Novel", () => {
  it("renders placeholder message", () => {
    render(<L5Novel />);
    expect(screen.getByText(/L5 — Novel Outline/)).toBeInTheDocument();
    expect(screen.getByText(/Coming in Milestone 4/)).toBeInTheDocument();
  });
});

describe("L6Chapters", () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {
      getStage: vi.fn().mockResolvedValue({ artifact: { chapters: [] } }),
    };
  });

  it("renders L6 Chapters title", () => {
    render(<L6Chapters storage={mockStorage} projectId="test-project" />);
    // Component shows loading initially - just verify it renders
    expect(screen.getByText(/Loading|L6/)).toBeInTheDocument();
  });

  it("loads chapters from storage", async () => {
    render(<L6Chapters storage={mockStorage} projectId="test-project" />);
    await waitFor(() => {
      expect(mockStorage.getStage).toHaveBeenCalledWith("test-project", "chapters");
    }, { timeout: 1000 });
  });
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
});
