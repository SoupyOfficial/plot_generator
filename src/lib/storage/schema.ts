import { sqliteTable, text, integer, real, primaryKey, unique } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  selections: text('selections', { mode: 'json' }), // JSON: original form selections
});

// Canon tables (normalized per facet)
export const canonPremise = sqliteTable('canon_premise', {
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  premise: text('premise').notNull(),
  genre: text('genre'),
  tone: text('tone'),
  lockedAt: integer('locked_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId] }),
}));

export const canonVoice = sqliteTable('canon_voice', {
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  avgSentenceLen: real('avg_sentence_len'),
  sentenceLenStdDev: real('sentence_len_std_dev'),
  avgParagraphLen: real('avg_paragraph_len'),
  dialogueRatio: real('dialogue_ratio'),
  saidRatio: real('said_ratio'),
  povHint: text('pov_hint'),
  tenseHint: text('tense_hint'),
  lexicalDiversity: real('lexical_diversity'),
  llmDescription: text('llm_description'),
  lockedAt: integer('locked_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId] }),
}));

export const canonCharacters = sqliteTable('canon_characters', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role'),
  archetype: text('archetype'),
  traits: text('traits', { mode: 'json' }), // JSON array
  voiceSample: text('voice_sample'),
  arc: text('arc'),
  lockedAt: integer('locked_at', { mode: 'timestamp' }).notNull(),
});

export const canonWorld = sqliteTable('canon_world', {
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  rules: text('rules', { mode: 'json' }),
  places: text('places', { mode: 'json' }),
  vocabulary: text('vocabulary', { mode: 'json' }),
  lockedAt: integer('locked_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId] }),
}));

export const canonPromise = sqliteTable('canon_promise', {
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  protagonist: text('protagonist'),
  want: text('want'),
  obstacle: text('obstacle'),
  stakes: text('stakes'),
  irony: text('irony'),
  endingShape: text('ending_shape'),
  lockedAt: integer('locked_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId] }),
}));

// Stage artifact tables
export const seeds = sqliteTable('seeds', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  status: text('status').notNull(), // 'fresh' | 'stale' | 'locked'
  artifact: text('artifact', { mode: 'json' }).notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
}, (table) => ({
  unq: unique().on(table.projectId, table.version),
}));

export const promises = sqliteTable('promises', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  artifact: text('artifact', { mode: 'json' }).notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
}, (table) => ({
  unq: unique().on(table.projectId, table.version),
}));

export const shortStories = sqliteTable('short_stories', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  artifact: text('artifact', { mode: 'json' }).notNull(),
  prose: text('prose').notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
}, (table) => ({
  unq: unique().on(table.projectId, table.version),
}));

export const novellaOutlines = sqliteTable('novella_outlines', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  artifact: text('artifact', { mode: 'json' }).notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
}, (table) => ({
  unq: unique().on(table.projectId, table.version),
}));

export const novelOutlines = sqliteTable('novel_outlines', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  artifact: text('artifact', { mode: 'json' }).notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
}, (table) => ({
  unq: unique().on(table.projectId, table.version),
}));

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  indexNum: integer('index_num').notNull(),
  version: integer('version').notNull().default(1),
  status: text('status').notNull(),
  scaffold: text('scaffold', { mode: 'json' }),
  prose: text('prose'),
  audit: text('audit', { mode: 'json' }),
  fingerprint: text('fingerprint', { mode: 'json' }),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  unq: unique().on(table.projectId, table.indexNum, table.version),
}));

export const candidates = sqliteTable('candidates', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  stageKey: text('stage_key').notNull(), // 'seed' | 'promise' | etc.
  artifact: text('artifact', { mode: 'json' }).notNull(),
  picked: integer('picked', { mode: 'boolean' }).notNull().default(0),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
});
