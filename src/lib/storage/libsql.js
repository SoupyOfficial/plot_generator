/**
 * LibSQL/Turso storage adapter using Drizzle ORM.
 * Runs auto-migration on first connect and migrates localStorage if needed.
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, and, desc } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
const randomUUID = () => crypto.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
import * as schema from './schema.ts';
import { migrateFromLocalStorage } from './migrate.js';

export function createLibSQLAdapter(config = {}) {
  const url = config.url || import.meta.env.VITE_TURSO_URL;
  const authToken = config.authToken || import.meta.env.VITE_TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      'LibSQL adapter requires VITE_TURSO_URL and VITE_TURSO_AUTH_TOKEN environment variables'
    );
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  let migrationRun = false;

  async function ensureMigrated() {
    if (migrationRun) return;
    
    // Run Drizzle migrations
    await migrate(db, { migrationsFolder: './drizzle' });
    
    // Run localStorage migration if this is the first connection
    const adapter = createAdapterMethods();
    await migrateFromLocalStorage(adapter);
    
    migrationRun = true;
  }

  function createAdapterMethods() {
    return {
      // Project CRUD
      async createProject(data) {
        await ensureMigrated();
        
        const project = {
          id: data.id || randomUUID(),
          title: data.title,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
          selections: data.selections || null,
        };
        
        await db.insert(schema.projects).values(project);
        return project;
      },

      async getProject(id) {
        await ensureMigrated();
        const rows = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
        return rows[0] || null;
      },

      async listProjects() {
        await ensureMigrated();
        return await db.select().from(schema.projects).orderBy(desc(schema.projects.updatedAt));
      },

      async deleteProject(id) {
        await ensureMigrated();
        // Cascade deletes are handled by FK constraints
        await db.delete(schema.projects).where(eq(schema.projects.id, id));
        return true;
      },

      // Canon facet operations
      async saveCanonFacet(facet, projectId, data) {
        await ensureMigrated();
        
        const canon = {
          projectId,
          ...data,
          lockedAt: data.lockedAt || new Date(),
        };
        
        switch (facet) {
          case 'premise':
            await db.insert(schema.canonPremise).values(canon)
              .onConflictDoUpdate({ target: schema.canonPremise.projectId, set: canon });
            break;
          case 'voice':
            await db.insert(schema.canonVoice).values(canon)
              .onConflictDoUpdate({ target: schema.canonVoice.projectId, set: canon });
            break;
          case 'world':
            await db.insert(schema.canonWorld).values(canon)
              .onConflictDoUpdate({ target: schema.canonWorld.projectId, set: canon });
            break;
          case 'promise':
            await db.insert(schema.canonPromise).values(canon)
              .onConflictDoUpdate({ target: schema.canonPromise.projectId, set: canon });
            break;
          case 'character':
            const charId = data.id || randomUUID();
            const character = { ...canon, id: charId };
            await db.insert(schema.canonCharacters).values(character);
            return character;
          default:
            throw new Error(`Unknown canon facet: ${facet}`);
        }
        
        return canon;
      },

      async getCanon(facet, projectId, characterId = null) {
        await ensureMigrated();
        
        switch (facet) {
          case 'premise': {
            const rows = await db.select().from(schema.canonPremise)
              .where(eq(schema.canonPremise.projectId, projectId));
            return rows[0] || null;
          }
          case 'voice': {
            const rows = await db.select().from(schema.canonVoice)
              .where(eq(schema.canonVoice.projectId, projectId));
            return rows[0] || null;
          }
          case 'world': {
            const rows = await db.select().from(schema.canonWorld)
              .where(eq(schema.canonWorld.projectId, projectId));
            return rows[0] || null;
          }
          case 'promise': {
            const rows = await db.select().from(schema.canonPromise)
              .where(eq(schema.canonPromise.projectId, projectId));
            return rows[0] || null;
          }
          case 'character': {
            if (characterId) {
              const rows = await db.select().from(schema.canonCharacters)
                .where(eq(schema.canonCharacters.id, characterId));
              return rows[0] || null;
            }
            return await db.select().from(schema.canonCharacters)
              .where(eq(schema.canonCharacters.projectId, projectId));
          }
          default:
            throw new Error(`Unknown canon facet: ${facet}`);
        }
      },

      // Stage artifact operations
      async saveStage(stageKey, data) {
        await ensureMigrated();
        
        const stage = {
          id: data.id || randomUUID(),
          projectId: data.projectId,
          version: data.version,
          status: data.status || 'fresh',
          artifact: data.artifact,
          generatedAt: data.generatedAt || new Date(),
          lockedAt: data.lockedAt || null,
          ...(stageKey === 'short_story' && { prose: data.prose }),
        };
        
        const table = getStageTable(stageKey);
        await db.insert(table).values(stage);
        return stage;
      },

      async getStage(stageKey, projectId, version) {
        await ensureMigrated();
        
        const table = getStageTable(stageKey);
        const rows = await db.select().from(table)
          .where(and(
            eq(table.projectId, projectId),
            eq(table.version, version)
          ));
        return rows[0] || null;
      },

      async listStageVersions(stageKey, projectId) {
        await ensureMigrated();
        
        const table = getStageTable(stageKey);
        return await db.select().from(table)
          .where(eq(table.projectId, projectId))
          .orderBy(desc(table.version));
      },

      async lockStage(projectId, stageKey, artifact) {
        await ensureMigrated();
        
        // Determine latest version
        const existing = await this.listStageVersions(stageKey, projectId);
        const latestVersion = existing.length > 0 ? existing[0].version : 0;
        const newVersion = latestVersion + 1;

        // Save stage with locked status
        const lockedStage = await this.saveStage(stageKey, {
          projectId,
          version: newVersion,
          status: 'locked',
          artifact,
          generatedAt: new Date(),
          lockedAt: new Date(),
        });

        // Write to canon facet based on stage
        if (stageKey === 'seed') {
          await this.saveCanonFacet('premise', projectId, {
            premise: artifact.premise,
            genre: artifact.genre,
            tone: artifact.tone,
            lockedAt: new Date(),
          });
        } else if (stageKey === 'promise') {
          await this.saveCanonFacet('promise', projectId, {
            protagonist: artifact.protagonist,
            want: artifact.want,
            obstacle: artifact.obstacle,
            stakes: artifact.stakes,
            irony: artifact.irony || '',
            endingShape: artifact.endingShape || 'bittersweet',
            lockedAt: new Date(),
          });
        }

        return lockedStage;
      },

      // Chapter operations
      async saveChapter(data) {
        await ensureMigrated();
        
        const chapter = {
          id: data.id || randomUUID(),
          projectId: data.projectId,
          indexNum: data.indexNum,
          version: data.version || 1,
          status: data.status || 'fresh',
          scaffold: data.scaffold || null,
          prose: data.prose || null,
          audit: data.audit || null,
          fingerprint: data.fingerprint || null,
          generatedAt: data.generatedAt || new Date(),
        };
        
        await db.insert(schema.chapters).values(chapter);
        return chapter;
      },

      async getChapter(projectId, indexNum, version = null) {
        await ensureMigrated();
        
        if (version !== null) {
          const rows = await db.select().from(schema.chapters)
            .where(and(
              eq(schema.chapters.projectId, projectId),
              eq(schema.chapters.indexNum, indexNum),
              eq(schema.chapters.version, version)
            ));
          return rows[0] || null;
        }
        
        // Get latest version
        const rows = await db.select().from(schema.chapters)
          .where(and(
            eq(schema.chapters.projectId, projectId),
            eq(schema.chapters.indexNum, indexNum)
          ))
          .orderBy(desc(schema.chapters.version))
          .limit(1);
        
        return rows[0] || null;
      },

      async listChapters(projectId, version = null) {
        await ensureMigrated();
        
        let query = db.select().from(schema.chapters)
          .where(eq(schema.chapters.projectId, projectId));
        
        if (version !== null) {
          query = query.where(eq(schema.chapters.version, version));
        }
        
        return await query.orderBy(schema.chapters.indexNum, desc(schema.chapters.version));
      },

      // Candidate operations
      async saveCandidate(data) {
        await ensureMigrated();
        
        const candidate = {
          id: data.id || randomUUID(),
          projectId: data.projectId,
          stageKey: data.stageKey,
          artifact: data.artifact,
          picked: data.picked || false,
          generatedAt: data.generatedAt || new Date(),
        };
        
        await db.insert(schema.candidates).values(candidate);
        return candidate;
      },

      async getCandidates(projectId, stageKey) {
        await ensureMigrated();
        
        return await db.select().from(schema.candidates)
          .where(and(
            eq(schema.candidates.projectId, projectId),
            eq(schema.candidates.stageKey, stageKey)
          ))
          .orderBy(schema.candidates.generatedAt);
      },

      async pickCandidate(candidateId) {
        await ensureMigrated();
        
        const rows = await db.select().from(schema.candidates)
          .where(eq(schema.candidates.id, candidateId));
        
        if (!rows.length) return null;
        
        const candidate = rows[0];
        
        // Unpick all others for same project/stage
        await db.update(schema.candidates)
          .set({ picked: false })
          .where(and(
            eq(schema.candidates.projectId, candidate.projectId),
            eq(schema.candidates.stageKey, candidate.stageKey)
          ));
        
        // Pick this one
        await db.update(schema.candidates)
          .set({ picked: true })
          .where(eq(schema.candidates.id, candidateId));
        
        return { ...candidate, picked: true };
      },
    };
  }

  // Helper to get the right schema table for a stage
  function getStageTable(stageKey) {
    switch (stageKey) {
      case 'seed':
        return schema.seeds;
      case 'promise':
        return schema.promises;
      case 'short_story':
        return schema.shortStories;
      case 'novella_outline':
        return schema.novellaOutlines;
      case 'novel_outline':
        return schema.novelOutlines;
      default:
        throw new Error(`Unknown stage key: ${stageKey}`);
    }
  }

  return createAdapterMethods();
}
