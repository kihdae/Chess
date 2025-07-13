import { pgTable, serial, varchar, timestamp, integer, json, text, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Players table
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  totalGames: integer('total_games').default(0).notNull(),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  draws: integer('draws').default(0).notNull(),
  averageMoveTime: integer('average_move_time').default(0).notNull(),
  preferredOpenings: json('preferred_openings').$type<string[]>().default([]),
});

// Games table
export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  whitePlayerId: integer('white_player_id').references(() => players.id),
  blackPlayerId: integer('black_player_id').references(() => players.id),
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  result: varchar('result', { length: 10 }),
  totalMoves: integer('total_moves').default(0).notNull(),
  isAIGame: boolean('is_ai_game').default(false).notNull(),
  aiDifficulty: varchar('ai_difficulty', { length: 10 }),
  finalFen: text('final_fen'),
});

// Moves table
export const moves = pgTable('moves', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').references(() => games.id).notNull(),
  playerId: integer('player_id').references(() => players.id),
  moveNumber: integer('move_number').notNull(),
  move: varchar('move', { length: 10 }).notNull(),
  timeSpent: integer('time_spent').notNull(),
  fen: text('fen').notNull(),
  isCheck: boolean('is_check').default(false).notNull(),
  isCapture: boolean('is_capture').default(false).notNull(),
});

// Game Statistics table
export const gameStats = pgTable('game_stats', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').references(() => games.id).notNull(),
  openingName: varchar('opening_name', { length: 100 }),
  totalCaptures: integer('total_captures').default(0).notNull(),
  checks: integer('checks').default(0).notNull(),
  averageMoveTime: integer('average_move_time').default(0).notNull(),
  materialAdvantage: json('material_advantage').$type<Record<string, number>>(),
});

// Relations
export const gameRelations = relations(games, ({ one, many }) => ({
  whitePlayer: one(players, {
    fields: [games.whitePlayerId],
    references: [players.id],
  }),
  blackPlayer: one(players, {
    fields: [games.blackPlayerId],
    references: [players.id],
  }),
  moves: many(moves),
  stats: one(gameStats, {
    fields: [games.id],
    references: [gameStats.gameId],
  }),
}));

export const moveRelations = relations(moves, ({ one }) => ({
  game: one(games, {
    fields: [moves.gameId],
    references: [games.id],
  }),
  player: one(players, {
    fields: [moves.playerId],
    references: [players.id],
  }),
}));

export const playerRelations = relations(players, ({ many }) => ({
  gamesAsWhite: many(games, { relationName: 'whitePlayer' }),
  gamesAsBlack: many(games, { relationName: 'blackPlayer' }),
  moves: many(moves),
})); 