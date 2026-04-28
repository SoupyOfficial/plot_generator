// src/components/inspectionDrawer.jsx
//
// Inspection Drawer — Bottom tabs for canon/audit/history/raw views.
// Provides read-only inspection of locked artifacts, post-gen feedback, revision history, and debug dumps.
//
// Tab structure:
//   - CANON: Read-only JSON tree of all locked stage artifacts (L1-L6)
//   - AUDIT: Post-generation weak spots + feedback (migrated from App.jsx gamify)
//   - HISTORY: Project revision timeline from storage.listCandidates
//   - RAW: Debug JSON dump of current in-flight state (selections + artifacts)

import { useState, useEffect } from "react";
import { COLOR } from "./layerComponents.jsx";
import { WeakSpots } from "./gamify.jsx";

const S = {
  drawer: {
    borderTop: `1px solid ${COLOR.border}`,
    background: COLOR.bg,
    fontFamily: "'Courier New', Courier, monospace",
  },
  tabRow: {
    display: "flex",
    gap: "4px",
    padding: "8px 12px 0 12px",
    background: "rgba(0,0,0,0.2)",
    borderBottom: `1px solid ${COLOR.border}`,
  },
  tab: (active) => ({
    padding: "8px 16px",
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "1px",
    background: active ? COLOR.panel : "transparent",
    color: active ? COLOR.purpleLight : COLOR.dim,
    border: "none",
    borderTop: active ? `2px solid ${COLOR.purple}` : "2px solid transparent",
    borderRadius: "2px 2px 0 0",
    cursor: "pointer",
    transition: "all 0.15s",
  }),
  content: {
    padding: "16px",
    maxHeight: "300px",
    overflowY: "auto",
    fontSize: "12px",
    color: COLOR.text,
  },
  jsonTree: {
    background: "rgba(0,0,0,0.3)",
    padding: "12px",
    borderRadius: "2px",
    border: `1px solid ${COLOR.border}`,
    whiteSpace: "pre-wrap",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "11px",
    lineHeight: 1.6,
  },
  emptyState: {
    textAlign: "center",
    color: COLOR.dim,
    padding: "32px",
  },
  historyItem: {
    padding: "12px",
    marginBottom: "8px",
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "2px",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  historyTimestamp: {
    fontSize: "11px",
    color: COLOR.muted,
  },
  restoreBtn: {
    padding: "4px 12px",
    fontSize: "10px",
    fontWeight: "600",
    background: COLOR.purple,
    color: "#fff",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    letterSpacing: "1px",
  },
  historyMeta: {
    fontSize: "11px",
    color: COLOR.dim,
  },
};

const TABS = ["CANON", "AUDIT", "HISTORY", "RAW"];

/**
 * Inspection Drawer component
 *
 * @param {Object} props
 * @param {Object} props.storage - Storage adapter instance
 * @param {string} props.projectId - Current project ID
 * @param {string} props.currentStage - Currently active stage ('seed', 'promise', etc.)
 * @param {Object} props.currentSelections - In-flight selections (for RAW tab)
 * @param {Object} props.weakSpots - Weak spots data from App.jsx gamify (for AUDIT tab)
 * @param {Function} props.onRestore - Callback when restoring from history: (candidateId) => void
 */
export function InspectionDrawer({
  storage,
  projectId,
  currentStage,
  currentSelections = {},
  weakSpots = null,
  onRestore,
}) {
  const [activeTab, setActiveTab] = useState("CANON");
  const [canonData, setCanonData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load canon artifacts when tab switches to CANON
  useEffect(() => {
    if (activeTab !== "CANON" || !storage || !projectId) return;

    async function loadCanon() {
      setLoading(true);
      try {
        const canon = await storage.getCanon(projectId);
        setCanonData(canon);
      } catch (err) {
        console.error("Failed to load canon:", err);
        setCanonData(null);
      } finally {
        setLoading(false);
      }
    }

    loadCanon();
  }, [activeTab, storage, projectId]);

  // Load history candidates when tab switches to HISTORY
  useEffect(() => {
    if (activeTab !== "HISTORY" || !storage || !projectId || !currentStage) return;

    async function loadHistory() {
      setLoading(true);
      try {
        const candidates = await storage.listCandidates(projectId, currentStage);
        setHistoryData(candidates || []);
      } catch (err) {
        console.error("Failed to load history:", err);
        setHistoryData([]);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [activeTab, storage, projectId, currentStage]);

  function renderContent() {
    if (loading) {
      return <div style={S.emptyState}>Loading...</div>;
    }

    switch (activeTab) {
      case "CANON":
        return renderCanonTab();
      case "AUDIT":
        return renderAuditTab();
      case "HISTORY":
        return renderHistoryTab();
      case "RAW":
        return renderRawTab();
      default:
        return null;
    }
  }

  function renderCanonTab() {
    if (!canonData || Object.keys(canonData).length === 0) {
      return (
        <div style={S.emptyState}>
          No locked artifacts yet. Lock a stage (L1 or L2) to freeze canon snapshots.
        </div>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: "12px", color: COLOR.muted }}>
          Read-only view of all locked stage artifacts. These snapshots form the canonical
          blueprint for generation.
        </div>
        <div style={S.jsonTree}>{JSON.stringify(canonData, null, 2)}</div>
      </div>
    );
  }

  function renderAuditTab() {
    if (!weakSpots || weakSpots.length === 0) {
      return (
        <div style={S.emptyState}>
          No weak spots identified yet. Generate a seed in L3 to receive coherence feedback.
        </div>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: "12px", color: COLOR.muted }}>
          Post-generation feedback: areas where your selections might create plot holes or pacing
          issues.
        </div>
        <WeakSpots weakSpots={weakSpots} fixedIds={[]} onMarkFixed={() => {}} />
      </div>
    );
  }

  function renderHistoryTab() {
    if (historyData.length === 0) {
      return (
        <div style={S.emptyState}>
          No revision history for {currentStage || "this stage"}. Auto-saved candidates will
          appear here.
        </div>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: "12px", color: COLOR.muted }}>
          Revision timeline for {currentStage || "current stage"}. Restore a previous snapshot to
          roll back changes.
        </div>
        {historyData.map((candidate) => (
          <div key={candidate.id} style={S.historyItem}>
            <div style={S.historyHeader}>
              <div style={S.historyTimestamp}>
                {new Date(candidate.savedAt || candidate.createdAt).toLocaleString()}
              </div>
              <button
                type="button"
                style={S.restoreBtn}
                onClick={() => onRestore?.(candidate.id)}
              >
                ↻ RESTORE
              </button>
            </div>
            <div style={S.historyMeta}>
              {candidate.fingerprint && `Fingerprint: ${candidate.fingerprint.slice(0, 8)}...`}
              {candidate.artifact?.coherence?.label && ` • ${candidate.artifact.coherence.label}`}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderRawTab() {
    const rawData = {
      projectId,
      currentStage,
      selections: currentSelections,
      timestamp: new Date().toISOString(),
    };

    return (
      <div>
        <div style={{ marginBottom: "12px", color: COLOR.muted }}>
          Debug dump of current in-flight state (not saved to storage yet). Useful for
          troubleshooting.
        </div>
        <div style={S.jsonTree}>{JSON.stringify(rawData, null, 2)}</div>
      </div>
    );
  }

  return (
    <div style={S.drawer}>
      <div style={S.tabRow}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            style={S.tab(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={S.content}>{renderContent()}</div>
    </div>
  );
}
