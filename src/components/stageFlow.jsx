// src/components/stageFlow.jsx
//
// StageFlow — unified multi-project shell with stage-based navigation
//
// 4-region layout:
//   - Project picker bar (top)
//   - Stage rail (left) with L1-L6 dots
//   - Main panel (center) for stage-specific content
//   - Inspection drawer (bottom) with CANON/AUDIT/HISTORY/RAW tabs
//
// Props:
//   - storage: storage adapter instance
//   - currentProjectId: active project ID
//   - onProjectChange: (projectId) => void
//   - renderStage: (stage, props) => JSX — stage content renderer

import { useEffect, useState, useMemo } from "react";
import { ProjectPicker } from "./projectPicker.jsx";

const SF_COLOR = {
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
  amber: "#fbbf24",
  amberSoft: "#d4a843",
  green: "#4ade80",
  greenSoft: "#6ecf7b",
  red: "#f87171",
};

const SF_FONT = "'Courier New', Courier, monospace";

const STAGES = [
  { id: "l1", label: "L1", name: "Seed", desc: "Premise + Voice" },
  { id: "l2", label: "L2", name: "Promise", desc: "World + Characters" },
  { id: "l3", label: "L3", name: "Short Story", desc: "1.5–3k words" },
  { id: "l4", label: "L4", name: "Novella Outline", desc: "5–7 chapters" },
  { id: "l5", label: "L5", name: "Novel Outline", desc: "15–30 chapters" },
  { id: "l6", label: "L6", name: "Chapters", desc: "Full prose pipeline" },
];

const DRAWER_TABS = [
  { id: "canon", label: "CANON", desc: "Locked selections" },
  { id: "audit", label: "AUDIT", desc: "Weak spots + feedback" },
  { id: "history", label: "HISTORY", desc: "Revision timeline" },
  { id: "raw", label: "RAW", desc: "Debug JSON dump" },
];

/**
 * Main StageFlow shell component
 */
export function StageFlow({
  storage,
  currentProjectId,
  onProjectChange,
  renderStage,
  children,
}) {
  const [currentStage, setCurrentStage] = useState("l1");
  const [drawerTab, setDrawerTab] = useState("canon");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stageStatus, setStageStatus] = useState({});

  // Load stage status from storage
  useEffect(() => {
    if (!storage || !currentProjectId) return;

    async function loadStatus() {
      const status = {};
      for (const stage of STAGES) {
        try {
          const artifact = await storage.getStage(currentProjectId, stage.id);
          if (artifact?.locked) {
            status[stage.id] = "locked";
          } else if (artifact?.draft || artifact?.artifact) {
            status[stage.id] = "stale";
          } else {
            status[stage.id] = "fresh";
          }
        } catch (err) {
          status[stage.id] = "fresh";
        }
      }
      setStageStatus(status);
    }

    loadStatus();
  }, [storage, currentProjectId]);

  // Keyboard shortcuts: 1-6 for stage jump, D for drawer toggle
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return; // Don't interfere with typing
      }

      const key = e.key;
      if (key >= "1" && key <= "6") {
        const stageIndex = parseInt(key, 10) - 1;
        setCurrentStage(STAGES[stageIndex].id);
      } else if (key === "d" || key === "D") {
        setDrawerOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const currentStageData = STAGES.find((s) => s.id === currentStage);

  return (
    <div style={shellStyles.root}>
      {/* Project picker bar */}
      <div style={shellStyles.projectBar}>
        <ProjectPicker
          storage={storage}
          currentProjectId={currentProjectId}
          onProjectChange={onProjectChange}
        />
      </div>

      {/* Main content area with stage rail + panel */}
      <div style={shellStyles.contentGrid}>
        {/* Stage rail (left) */}
        <aside style={shellStyles.stageRail}>
          <div style={shellStyles.stageRailHeader}>
            <span style={{ fontSize: 11, color: SF_COLOR.dim }}>STAGES</span>
          </div>
          {STAGES.map((stage) => (
            <StageButton
              key={stage.id}
              stage={stage}
              active={currentStage === stage.id}
              status={stageStatus[stage.id] || "fresh"}
              onClick={() => setCurrentStage(stage.id)}
            />
          ))}
          <div style={shellStyles.stageRailFooter}>
            <button
              type="button"
              style={shellStyles.drawerToggle}
              onClick={() => setDrawerOpen(!drawerOpen)}
              title="Toggle inspection drawer (D)"
            >
              {drawerOpen ? "▼" : "▲"} INSPECT
            </button>
          </div>
        </aside>

        {/* Main panel (center) */}
        <main style={shellStyles.mainPanel}>
          <div style={shellStyles.mainHeader}>
            <h2 style={shellStyles.stageTitle}>
              {currentStageData?.label} · {currentStageData?.name}
            </h2>
            <p style={shellStyles.stageDesc}>{currentStageData?.desc}</p>
          </div>
          <div style={shellStyles.mainContent}>
            {renderStage ? (
              renderStage(currentStage, {
                storage,
                projectId: currentProjectId,
                onLockStage: async (artifact) => {
                  if (storage && currentProjectId) {
                    await storage.saveStage(
                      currentProjectId,
                      currentStage,
                      artifact,
                      { locked: true }
                    );
                    setStageStatus((prev) => ({
                      ...prev,
                      [currentStage]: "locked",
                    }));
                  }
                },
              })
            ) : (
              <div style={shellStyles.placeholder}>
                <p style={{ color: SF_COLOR.muted }}>
                  Stage content renderer not provided
                </p>
                <p style={{ color: SF_COLOR.dim, fontSize: 13 }}>
                  Pass a <code>renderStage</code> prop to display stage panels
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Inspection drawer (bottom) */}
      {drawerOpen && (
        <aside style={shellStyles.drawer}>
          <div style={shellStyles.drawerTabs}>
            {DRAWER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                style={{
                  ...shellStyles.drawerTab,
                  ...(drawerTab === tab.id ? shellStyles.drawerTabActive : {}),
                }}
                onClick={() => setDrawerTab(tab.id)}
                title={tab.desc}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={shellStyles.drawerContent}>
            <DrawerContent
              tab={drawerTab}
              storage={storage}
              projectId={currentProjectId}
              currentStage={currentStage}
            />
          </div>
        </aside>
      )}
    </div>
  );
}

/**
 * Individual stage button in the rail
 */
function StageButton({ stage, active, status, onClick }) {
  const statusColor =
    status === "locked"
      ? SF_COLOR.purple
      : status === "stale"
      ? SF_COLOR.amber
      : SF_COLOR.green;

  return (
    <button
      type="button"
      style={{
        ...stageButtonStyles.base,
        ...(active ? stageButtonStyles.active : {}),
      }}
      onClick={onClick}
      title={`${stage.label} · ${stage.name} · ${stage.desc}`}
    >
      <div style={{ ...stageButtonStyles.dot, background: statusColor }} />
      <span style={stageButtonStyles.label}>{stage.label}</span>
      <span style={stageButtonStyles.name}>{stage.name}</span>
    </button>
  );
}

/**
 * Drawer content switcher
 */
function DrawerContent({ tab, storage, projectId, currentStage }) {
  const [canonData, setCanonData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storage || !projectId) return;

    async function loadData() {
      setLoading(true);
      try {
        if (tab === "canon") {
          const canon = await storage.getCanon(projectId);
          setCanonData(canon);
        } else if (tab === "history") {
          const candidates = await storage.listCandidates(projectId, currentStage);
          setHistoryData(candidates || []);
        }
      } catch (err) {
        console.error("Failed to load drawer data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tab, storage, projectId, currentStage]);

  if (loading) {
    return (
      <div style={drawerStyles.emptyState}>
        <span style={{ color: SF_COLOR.muted }}>Loading...</span>
      </div>
    );
  }

  switch (tab) {
    case "canon":
      return (
        <div style={drawerStyles.canonView}>
          {canonData ? (
            <pre style={drawerStyles.jsonPre}>
              {JSON.stringify(canonData, null, 2)}
            </pre>
          ) : (
            <div style={drawerStyles.emptyState}>
              <span style={{ color: SF_COLOR.dim }}>
                No locked canon yet. Lock a stage to see it here.
              </span>
            </div>
          )}
        </div>
      );

    case "audit":
      return (
        <div style={drawerStyles.auditView}>
          <div style={drawerStyles.emptyState}>
            <span style={{ color: SF_COLOR.dim }}>
              Weak spots will appear here after generation
            </span>
          </div>
        </div>
      );

    case "history":
      return (
        <div style={drawerStyles.historyView}>
          {historyData.length > 0 ? (
            <ul style={drawerStyles.historyList}>
              {historyData.map((candidate, idx) => (
                <li key={idx} style={drawerStyles.historyItem}>
                  <span style={{ color: SF_COLOR.purpleSoft }}>
                    {new Date(candidate.createdAt).toLocaleString()}
                  </span>
                  <span style={{ color: SF_COLOR.muted, marginLeft: 8 }}>
                    {candidate.picked ? "✓ Picked" : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={drawerStyles.emptyState}>
              <span style={{ color: SF_COLOR.dim }}>
                No history for this stage yet
              </span>
            </div>
          )}
        </div>
      );

    case "raw":
      return (
        <div style={drawerStyles.rawView}>
          <pre style={drawerStyles.jsonPre}>
            {JSON.stringify(
              {
                projectId,
                currentStage,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            )}
          </pre>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// STYLES
// ============================================================================

const shellStyles = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: SF_COLOR.bg,
    fontFamily: SF_FONT,
    color: SF_COLOR.text,
    overflow: "hidden",
  },

  projectBar: {
    height: 48,
    borderBottom: `1px solid ${SF_COLOR.border}`,
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    background: SF_COLOR.panel,
  },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    flex: 1,
    overflow: "hidden",
  },

  stageRail: {
    borderRight: `1px solid ${SF_COLOR.border}`,
    background: SF_COLOR.panel,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },

  stageRailHeader: {
    padding: "16px 12px 8px",
    borderBottom: `1px solid ${SF_COLOR.border}`,
  },

  stageRailFooter: {
    marginTop: "auto",
    padding: 12,
    borderTop: `1px solid ${SF_COLOR.border}`,
  },

  drawerToggle: {
    width: "100%",
    padding: "8px 12px",
    background: "transparent",
    border: `1px solid ${SF_COLOR.border}`,
    borderRadius: 4,
    color: SF_COLOR.muted,
    fontFamily: SF_FONT,
    fontSize: 11,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  mainPanel: {
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },

  mainHeader: {
    padding: "24px 32px 16px",
    borderBottom: `1px solid ${SF_COLOR.border}`,
    background: SF_COLOR.panel,
  },

  stageTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: SF_COLOR.purpleLight,
    fontFamily: SF_FONT,
  },

  stageDesc: {
    margin: "4px 0 0",
    fontSize: 13,
    color: SF_COLOR.muted,
    fontFamily: SF_FONT,
  },

  mainContent: {
    flex: 1,
    padding: 32,
    overflow: "auto",
  },

  placeholder: {
    textAlign: "center",
    padding: "48px 24px",
    color: SF_COLOR.dim,
    fontFamily: SF_FONT,
  },

  drawer: {
    height: 300,
    borderTop: `1px solid ${SF_COLOR.border}`,
    background: SF_COLOR.panel,
    display: "flex",
    flexDirection: "column",
  },

  drawerTabs: {
    display: "flex",
    gap: 4,
    padding: "8px 12px",
    borderBottom: `1px solid ${SF_COLOR.border}`,
  },

  drawerTab: {
    padding: "6px 12px",
    background: "transparent",
    border: "none",
    borderRadius: 4,
    color: SF_COLOR.muted,
    fontFamily: SF_FONT,
    fontSize: 11,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  drawerTabActive: {
    background: SF_COLOR.borderStrong,
    color: SF_COLOR.purpleLight,
  },

  drawerContent: {
    flex: 1,
    overflow: "auto",
    padding: 16,
  },
};

const stageButtonStyles = {
  base: {
    display: "grid",
    gridTemplateColumns: "8px 1fr",
    gridTemplateRows: "auto auto",
    gap: "4px 8px",
    alignItems: "center",
    padding: "10px 12px",
    background: "transparent",
    border: "none",
    borderLeft: "3px solid transparent",
    color: SF_COLOR.muted,
    fontFamily: SF_FONT,
    fontSize: 12,
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  active: {
    background: SF_COLOR.panelHover,
    borderLeftColor: SF_COLOR.purple,
    color: SF_COLOR.text,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    gridRow: "1 / 3",
  },

  label: {
    fontWeight: 600,
    fontSize: 11,
    color: "inherit",
  },

  name: {
    gridColumn: 2,
    fontSize: 11,
    color: SF_COLOR.dim,
  },
};

const drawerStyles = {
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    fontFamily: SF_FONT,
    fontSize: 13,
  },

  canonView: {
    height: "100%",
  },

  auditView: {
    height: "100%",
  },

  historyView: {
    height: "100%",
  },

  historyList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },

  historyItem: {
    padding: "8px 12px",
    borderBottom: `1px solid ${SF_COLOR.border}`,
    fontFamily: SF_FONT,
    fontSize: 12,
  },

  rawView: {
    height: "100%",
  },

  jsonPre: {
    margin: 0,
    padding: 16,
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${SF_COLOR.border}`,
    borderRadius: 4,
    color: SF_COLOR.text,
    fontFamily: SF_FONT,
    fontSize: 11,
    overflow: "auto",
    maxHeight: "100%",
  },
};
