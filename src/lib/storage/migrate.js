/**
 * One-time migration from localStorage to Turso/libSQL.
 * Runs automatically on first libsql adapter initialization.
 */

const MIGRATION_FLAG_KEY = 'plot_generator:_migrated';
const OLD_KEYS = [
  'plot_generator:selections-draft',
  'plot_generator:wizard-state',
  'plot_generator:last-selection',
  'plot_generator:selection-history',
  'plot_generator:user_notes',
  'plot_generator:llm_api_key',
  'plot_generator:anthropic_key',
];

export async function migrateFromLocalStorage(adapter, storage = globalThis.localStorage) {
  // If no storage available (e.g., Node.js/test environment), skip migration
  if (!storage) {
    return { migrated: false, reason: 'No storage available (likely test environment)' };
  }

  // Check if already migrated
  if (storage.getItem(MIGRATION_FLAG_KEY)) {
    return { migrated: false, reason: 'Already migrated' };
  }

  const log = [];
  let migrationProject = null;

  // Detect if there's any data to migrate
  const hasData = OLD_KEYS.some(key => storage.getItem(key) !== null);
  
  if (!hasData) {
    log.push('No localStorage data found to migrate');
    storage.setItem(MIGRATION_FLAG_KEY, new Date().toISOString());
    return { migrated: false, reason: 'No data to migrate', log };
  }

  try {
    // Create a project for migrated data
    migrationProject = await adapter.createProject({
      title: 'Migrated from localStorage',
      selections: null,
    });
    log.push(`Created migration project: ${migrationProject.id}`);

    // Migrate selections-draft
    const draftStr = storage.getItem('plot_generator:selections-draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        migrationProject.selections = draft;
        log.push('Migrated selections-draft');
      } catch (e) {
        log.push(`Failed to parse selections-draft: ${e.message}`);
      }
    }

    // Migrate selection-history as candidates
    const historyStr = storage.getItem('plot_generator:selection-history');
    if (historyStr) {
      try {
        const history = JSON.parse(historyStr);
        if (Array.isArray(history)) {
          for (const item of history.slice(0, 10)) { // Limit to 10 most recent
            await adapter.saveCandidate({
              projectId: migrationProject.id,
              stageKey: 'seed', // Best guess: treat old selections as seeds
              artifact: item,
            });
          }
          log.push(`Migrated ${Math.min(history.length, 10)} selection history items as candidates`);
        }
      } catch (e) {
        log.push(`Failed to parse selection-history: ${e.message}`);
      }
    }

    // Note: user_notes, llm_api_key, anthropic_key are left in localStorage
    // They don't belong in project-specific storage

    // Clear old keys (except API keys/notes which may still be needed)
    const keysToClear = [
      'plot_generator:selections-draft',
      'plot_generator:wizard-state',
      'plot_generator:last-selection',
      'plot_generator:selection-history',
    ];
    
    for (const key of keysToClear) {
      storage.removeItem(key);
      log.push(`Cleared ${key}`);
    }

    // Write migration log to localStorage for debugging
    storage.setItem('plot_generator:migration_log', JSON.stringify(log));
    
    // Set migrated flag
    storage.setItem(MIGRATION_FLAG_KEY, new Date().toISOString());
    
    return {
      migrated: true,
      projectId: migrationProject.id,
      log,
    };
  } catch (error) {
    log.push(`Migration failed: ${error.message}`);
    return {
      migrated: false,
      reason: error.message,
      log,
    };
  }
}
