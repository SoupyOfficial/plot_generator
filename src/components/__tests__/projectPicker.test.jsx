// src/components/__tests__/projectPicker.test.jsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectPicker } from "../projectPicker.jsx";

describe("ProjectPicker", () => {
  let mockStorage;
  let mockOnProjectChange;

  beforeEach(() => {
    mockStorage = {
      listProjects: vi.fn().mockResolvedValue([
        { id: "project-1", name: "Project One", description: "" },
        { id: "project-2", name: "Project Two", description: "" },
      ]),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
    };

    mockOnProjectChange = vi.fn();

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders project dropdown with loaded projects", async () => {
    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    // Should show loading initially
    expect(screen.getByText(/Loading.../)).toBeInTheDocument();

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    expect(mockStorage.listProjects).toHaveBeenCalledTimes(1);
  });

  it("auto-selects first project if none selected", async () => {
    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId={null}
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(mockOnProjectChange).toHaveBeenCalledWith("project-1");
    });

    // Should persist to localStorage
    expect(localStorage.getItem("stageflow:current-project")).toBe("project-1");
  });

  it("restores project from localStorage if available", async () => {
    localStorage.setItem("stageflow:current-project", "project-2");

    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId={null}
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(mockOnProjectChange).toHaveBeenCalledWith("project-2");
    });
  });

  it("changes project when selecting from dropdown", async () => {
    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox", { name: /select project/i });
    fireEvent.change(select, { target: { value: "project-2" } });

    expect(mockOnProjectChange).toHaveBeenCalledWith("project-2");
  });

  it("opens create modal when clicking NEW button", async () => {
    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    const newButton = screen.getByText(/NEW/);
    fireEvent.click(newButton);

    expect(screen.getByText("Create Project")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter project name.../)).toBeInTheDocument();
  });

  it("creates a new project when submitting create modal", async () => {
    mockStorage.createProject.mockResolvedValue({
      id: "project-3",
      name: "New Project",
      description: "",
    });

    mockStorage.listProjects.mockResolvedValueOnce([
      { id: "project-1", name: "Project One", description: "" },
      { id: "project-2", name: "Project Two", description: "" },
    ]);

    mockStorage.listProjects.mockResolvedValueOnce([
      { id: "project-1", name: "Project One", description: "" },
      { id: "project-2", name: "Project Two", description: "" },
      { id: "project-3", name: "New Project", description: "" },
    ]);

    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    // Open create modal
    fireEvent.click(screen.getByText(/NEW/));

    // Fill in project name
    const input = screen.getByPlaceholderText(/Enter project name.../);
    fireEvent.change(input, { target: { value: "New Project" } });

    // Submit
    const submitButton = screen.getByText("SUBMIT");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockStorage.createProject).toHaveBeenCalledWith({
        name: "New Project",
        description: "",
      });
    });

    expect(mockOnProjectChange).toHaveBeenCalledWith("project-3");
  });

  it("opens rename modal when clicking RENAME button", async () => {
    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    const renameButton = screen.getByText(/RENAME/);
    fireEvent.click(renameButton);

    expect(screen.getByText("Rename Project")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter new name.../)).toBeInTheDocument();
    
    // Check the input value
    const input = screen.getByPlaceholderText(/Enter new name.../);
    expect(input.value).toBe("Project One");
  });

  it("renames current project when submitting rename modal", async () => {
    mockStorage.updateProject.mockResolvedValue(undefined);

    mockStorage.listProjects.mockResolvedValueOnce([
      { id: "project-1", name: "Project One", description: "" },
      { id: "project-2", name: "Project Two", description: "" },
    ]);

    mockStorage.listProjects.mockResolvedValueOnce([
      { id: "project-1", name: "Renamed Project", description: "" },
      { id: "project-2", name: "Project Two", description: "" },
    ]);

    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    // Open rename modal
    fireEvent.click(screen.getByText(/RENAME/));

    // Change name
    const input = screen.getByPlaceholderText(/Enter new name.../);
    fireEvent.change(input, { target: { value: "Renamed Project" } });

    // Submit
    const submitButton = screen.getByText("SUBMIT");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockStorage.updateProject).toHaveBeenCalledWith("project-1", {
        name: "Renamed Project",
      });
    });
  });

  it("opens delete confirmation dialog when clicking DELETE button", async () => {
    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText(/DELETE/);
    fireEvent.click(deleteButton);

    expect(screen.getByText("Delete Project")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete "Project One"/)
    ).toBeInTheDocument();
  });

  it("deletes current project and selects first remaining when confirmed", async () => {
    mockStorage.deleteProject.mockResolvedValue(undefined);

    mockStorage.listProjects.mockResolvedValueOnce([
      { id: "project-1", name: "Project One", description: "" },
      { id: "project-2", name: "Project Two", description: "" },
    ]);

    mockStorage.listProjects.mockResolvedValueOnce([
      { id: "project-2", name: "Project Two", description: "" },
    ]);

    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    // Open delete dialog
    fireEvent.click(screen.getByText(/DELETE/));

    // Confirm delete
    const deleteButton = screen.getAllByText("DELETE").find((btn) => btn.type === "button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockStorage.deleteProject).toHaveBeenCalledWith("project-1");
    });

    expect(mockOnProjectChange).toHaveBeenCalledWith("project-2");
  });

  it("clears localStorage when deleting last project", async () => {
    mockStorage.listProjects.mockResolvedValueOnce([
      { id: "project-1", name: "Project One", description: "" },
    ]);

    mockStorage.listProjects.mockResolvedValueOnce([]);

    mockStorage.deleteProject.mockResolvedValue(undefined);

    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    // Open delete dialog
    fireEvent.click(screen.getByText(/DELETE/));

    // Confirm delete
    const deleteButton = screen.getAllByText("DELETE").find((btn) => btn.type === "button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockStorage.deleteProject).toHaveBeenCalledWith("project-1");
    });

    expect(mockOnProjectChange).toHaveBeenCalledWith(null);
    expect(localStorage.getItem("stageflow:current-project")).toBeNull();
  });

  it("cancels create modal when clicking CANCEL", async () => {
    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Project One")).toBeInTheDocument();
    });

    // Open create modal
    fireEvent.click(screen.getByText(/NEW/));
    expect(screen.getByText("Create Project")).toBeInTheDocument();

    // Cancel
    const cancelButton = screen.getByText("CANCEL");
    fireEvent.click(cancelButton);

    // Modal should close
    expect(screen.queryByText("Create Project")).not.toBeInTheDocument();
  });

  it("disables RENAME and DELETE buttons when no project selected", async () => {
    mockStorage.listProjects.mockResolvedValue([]);

    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId={null}
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
    });

    const renameButton = screen.getByText(/RENAME/).closest("button");
    const deleteButton = screen.getByText(/DELETE/).closest("button");

    expect(renameButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });

  it("persists selected project to localStorage", async () => {
    render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-1"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(localStorage.getItem("stageflow:current-project")).toBe("project-1");
    });

    // Change project
    mockOnProjectChange.mockClear();
    const { rerender } = render(
      <ProjectPicker
        storage={mockStorage}
        currentProjectId="project-2"
        onProjectChange={mockOnProjectChange}
      />
    );

    await waitFor(() => {
      expect(localStorage.getItem("stageflow:current-project")).toBe("project-2");
    });
  });
});
