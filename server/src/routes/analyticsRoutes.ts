import { Express } from 'express';
import { db } from '../db';
import { games, moves, players } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { validate, gameIdSchema, usernameSchema } from '../middleware/validation';

export const setupAnalyticsRoutes = (app: Express) => {
  app.get('/analytics/game/:gameId', 
    validate(gameIdSchema),
    async (req, res) => {
      try {
        const { gameId } = req.params;
        const gameIdNum = parseInt(gameId, 10);
        
        const gameData = await db.query.games.findFirst({
          where: eq(games.id, gameIdNum),
          with: {
            whitePlayer: true,
            blackPlayer: true,
            moves: true
          }
        });

        if (!gameData) {
          return res.status(404).json({ error: 'Game not found' });
        }

        // Calculate statistics
        const movesCount = gameData.moves.length;
        const gameDuration = gameData.endTime ? 
          (new Date(gameData.endTime).getTime() - new Date(gameData.startTime).getTime()) / 1000 : 
          null;

        const stats = {
          totalMoves: movesCount,
          durationSeconds: gameDuration,
          result: gameData.result,
          whitePlayer: gameData.whitePlayer?.username,
          blackPlayer: gameData.blackPlayer?.username,
          movesByColor: {
            white: Math.ceil(movesCount / 2),
            black: Math.floor(movesCount / 2)
          }
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
  });

  // Get player statistics
  app.get('/analytics/player/:username',
    validate(usernameSchema),
    async (req, res) => {
      try {
        const { username } = req.params;

        const player = await db.query.players.findFirst({
          where: eq(players.username, username),
          with: {
            gamesAsWhite: true,
            gamesAsBlack: true
          }
        });

        if (!player) {
          return res.status(404).json({ error: 'Player not found' });
        }

        const stats = {
          totalGames: player.totalGames,
          wins: player.wins,
          losses: player.losses,
          draws: player.draws,
          averageMoveTime: player.averageMoveTime,
          preferredOpenings: player.preferredOpenings
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
  });

  // Get global statistics
  app.get('/analytics/global', async (req, res) => {
    try {
      const totalGames = await db.select({ count: sql<number>`count(*)` })
        .from(games)
        .execute();

      const completedGames = await db.select({ count: sql<number>`count(*)` })
        .from(games)
        .where(sql`${games.endTime} IS NOT NULL`)
        .execute();

      const averageMovesPerGame = await db.select({ 
        avg: sql<number>`avg(${games.totalMoves})`
      })
      .from(games)
      .where(sql`${games.endTime} IS NOT NULL`)
      .execute();

      const stats = {
        totalGames: totalGames[0].count,
        completedGames: completedGames[0].count,
        averageMovesPerGame: Math.round(averageMovesPerGame[0].avg || 0),
        resultsDistribution: {
          whiteWins: await countResults('1-0'),
          blackWins: await countResults('0-1'),
          draws: await countResults('1/2-1/2')
        }
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function countResults(result: string): Promise<number> {
  const count = await db.select({ count: sql<number>`count(*)` })
    .from(games)
    .where(eq(games.result, result))
    .execute();
  return count[0].count;
} 