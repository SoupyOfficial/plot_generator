// src/components/projectPicker.jsx
//
// ProjectPicker — top bar with dropdown + CRUD controls
//
// Features:
//   - Dropdown showing all projects from storage.listProjects()
//   - Create button → modal for project name input
//   - Rename button → modal pre-filled with current project name
//   - Delete button → confirmation dialog
//   - Auto-select first project on mount if none selected
//   - Persist selected project ID to localStorage

import { useEffect, useState } from "react";

const PP_COLOR = {
  bg: "#0a0a0f",
  panel: "rgba(255,255,255,0.03)",
  panelHover: "rgba(255,255,255,0.06)",
  text: "#e2e0f0",
  muted: "#7c78a0",
  dim: "#6b6890",
  purple: "#8a5cf6",
  purpleSoft: "#a78bfa",
  purpleLight: "#c4b5fd",
  border: "rgba(138,92,246,0.25)",
  borderStrong: "rgba(138,92,246,0.6)",
  red: "#f87171",
  redBg: "rgba(248,113,113,0.08)",
};

const PP_FONT = "'Courier New', Courier, monospace";
const STORAGE_KEY = "stageflow:current-project";

/**
 * ProjectPicker component
 */
export function ProjectPicker({ storage, currentProjectId, onProjectChange }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load projects from storage on mount
  useEffect(() => {
    if (!storage) return;

    async function loadProjects() {
      setLoading(true);
      try {
        const allProjects = await storage.listProjects();
        setProjects(allProjects || []);

        // If currentProjectId already set, do nothing (controlled from parent)
        if (currentProjectId) {
          setLoading(false);
          return;
        }

        // Try to restore from localStorage first
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId && allProjects?.some((p) => p.id === savedId)) {
          onProjectChange?.(savedId);
          setLoading(false);
          return;
        }

        // Otherwise, auto-select first project if none selected
        if (!currentProjectId && allProjects && allProjects.length > 0) {
          const firstId = allProjects[0].id;
          localStorage.setItem(STORAGE_KEY, firstId);
          onProjectChange?.(firstId);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [storage]);

  // Persist current project to localStorage
  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem(STORAGE_KEY, currentProjectId);
    }
  }, [currentProjectId]);

  async function handleCreateProject(name) {
    if (!storage || !name?.trim()) return;

    try {
      const newProject = await storage.createProject({
        name: name.trim(),
        description: "",
      });
      const allProjects = await storage.listProjects();
      setProjects(allProjects || []);
      onProjectChange?.(newProject.id);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create project:", err);
      alert(`Failed to create project: ${err.message}`);
    }
  }

  async function handleRenameProject(newName) {
    if (!storage || !currentProjectId || !newName?.trim()) return;

    try {
      await storage.updateProject(currentProjectId, { name: newName.trim() });
      const allProjects = await storage.listProjects();
      setProjects(allProjects || []);
      setShowRenameModal(false);
    } catch (err) {
      console.error("Failed to rename project:", err);
      alert(`Failed to rename project: ${err.message}`);
    }
  }

  async function handleDeleteProject() {
    if (!storage || !currentProjectId) return;

    try {
      await storage.deleteProject(currentProjectId);
      const allProjects = await storage.listProjects();
      setProjects(allProjects || []);

      // Select first remaining project or null
      if (allProjects && allProjects.length > 0) {
        onProjectChange?.(allProjects[0].id);
      } else {
        onProjectChange?.(null);
        localStorage.removeItem(STORAGE_KEY);
      }

      setShowDeleteDialog(false);
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert(`Failed to delete project: ${err.message}`);
    }
  }

  function handleProjectSelect(projectId) {
    onProjectChange?.(projectId);
  }

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div style={pickerStyles.root}>
      <span style={pickerStyles.label}>// PROJECT:</span>

      {loading ? (
        <span style={pickerStyles.loading}>Loading...</span>
      ) : (
        <>
          <select
            value={currentProjectId || ""}
            onChange={(e) => handleProjectSelect(e.target.value)}
            style={pickerStyles.select}
            aria-label="Select project"
          >
            {projects.length === 0 ? (
              <option value="">No projects yet</option>
            ) : (
              projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))
            )}
          </select>

          <div style={pickerStyles.buttonRow}>
            <button
              type="button"
              style={pickerStyles.btn}
              onClick={() => setShowCreateModal(true)}
              title="Create new project"
            >
              + NEW
            </button>

            <button
              type="button"
              style={pickerStyles.btn}
              onClick={() => setShowRenameModal(true)}
              disabled={!currentProjectId}
              title="Rename current project"
            >
              ✎ RENAME
            </button>

            <button
              type="button"
              style={{ ...pickerStyles.btn, ...pickerStyles.btnDanger }}
              onClick={() => setShowDeleteDialog(true)}
              disabled={!currentProjectId}
              title="Delete current project"
            >
              ✕ DELETE
            </button>
          </div>
        </>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <ProjectModal
          title="Create Project"
          placeholder="Enter project name..."
          onSubmit={handleCreateProject}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* Rename modal */}
      {showRenameModal && (
        <ProjectModal
          title="Rename Project"
          placeholder="Enter new name..."
          defaultValue={currentProject?.name || ""}
          onSubmit={handleRenameProject}
          onCancel={() => setShowRenameModal(false)}
        />
      )}

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${currentProject?.name}"? This action cannot be undone.`}
          confirmLabel="DELETE"
          onConfirm={handleDeleteProject}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}

/**
 * Modal for create/rename operations
 */
function ProjectModal({ title, placeholder, defaultValue = "", onSubmit, onCancel }) {
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e) {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value);
    }
  }

  return (
    <div style={modalStyles.overlay} onClick={onCancel}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={modalStyles.title}>{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            style={modalStyles.input}
            aria-label={placeholder}
          />
          <div style={modalStyles.buttonRow}>
            <button type="submit" style={modalStyles.primaryBtn} disabled={!value.trim()}>
              SUBMIT
            </button>
            <button type="button" style={modalStyles.secondaryBtn} onClick={onCancel}>
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Confirmation dialog for delete operation
 */
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div style={modalStyles.overlay} onClick={onCancel}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={modalStyles.title}>{title}</h3>
        <p style={modalStyles.message}>{message}</p>
        <div style={modalStyles.buttonRow}>
          <button type="button" style={modalStyles.dangerBtn} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" style={modalStyles.secondaryBtn} onClick={onCancel}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const pickerStyles = {
  root: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 20px",
    height: "100%",
    fontFamily: PP_FONT,
  },

  label: {
    fontSize: 12,
    color: PP_COLOR.muted,
    fontWeight: 600,
  },

  loading: {
    fontSize: 13,
    color: PP_COLOR.dim,
    fontStyle: "italic",
  },

  select: {
    padding: "6px 12px",
    background: PP_COLOR.panel,
    border: `1px solid ${PP_COLOR.border}`,
    borderRadius: 4,
    color: PP_COLOR.text,
    fontFamily: PP_FONT,
    fontSize: 13,
    minWidth: 200,
    cursor: "pointer",
  },

  buttonRow: {
    display: "flex",
    gap: 8,
    marginLeft: "auto",
  },

  btn: {
    padding: "6px 12px",
    background: "transparent",
    border: `1px solid ${PP_COLOR.border}`,
    borderRadius: 4,
    color: PP_COLOR.purpleSoft,
    fontFamily: PP_FONT,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  btnDanger: {
    color: PP_COLOR.red,
    borderColor: PP_COLOR.red,
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  modal: {
    background: PP_COLOR.bg,
    border: `1px solid ${PP_COLOR.borderStrong}`,
    borderRadius: 8,
    padding: 24,
    minWidth: 400,
    maxWidth: 600,
    fontFamily: PP_FONT,
  },

  title: {
    margin: "0 0 16px",
    fontSize: 16,
    fontWeight: 600,
    color: PP_COLOR.purpleLight,
    fontFamily: PP_FONT,
  },

  message: {
    margin: "0 0 24px",
    fontSize: 13,
    color: PP_COLOR.text,
    lineHeight: 1.6,
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    background: PP_COLOR.panel,
    border: `1px solid ${PP_COLOR.border}`,
    borderRadius: 4,
    color: PP_COLOR.text,
    fontFamily: PP_FONT,
    fontSize: 13,
    marginBottom: 16,
  },

  buttonRow: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },

  primaryBtn: {
    padding: "8px 16px",
    background: PP_COLOR.purple,
    border: "none",
    borderRadius: 4,
    color: "#fff",
    fontFamily: PP_FONT,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  dangerBtn: {
    padding: "8px 16px",
    background: PP_COLOR.red,
    border: "none",
    borderRadius: 4,
    color: "#fff",
    fontFamily: PP_FONT,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  secondaryBtn: {
    padding: "8px 16px",
    background: "transparent",
    border: `1px solid ${PP_COLOR.border}`,
    borderRadius: 4,
    color: PP_COLOR.muted,
    fontFamily: PP_FONT,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
