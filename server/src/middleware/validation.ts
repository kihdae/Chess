import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const gameIdSchema = z.object({
  gameId: z.string().transform((val) => parseInt(val, 10))
});

export const usernameSchema = z.object({
  username: z.string().min(3).max(50)
});

export const moveSchema = z.object({
  gameId: z.number(),
  from: z.string().length(2),
  to: z.string().length(2),
  promotion: z.string().optional()
});

export const joinGameSchema = z.object({
  gameId: z.number(),
  username: z.string().min(3).max(50),
  role: z.enum(['white', 'black', 'spectator'])
});

export const chatMessageSchema = z.object({
  gameId: z.number(),
  username: z.string().min(3).max(50),
  message: z.string().min(1).max(500)
});

// Validation middleware factory
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = {
        ...req.body,
        ...req.params,
        ...req.query
      };

      await schema.parseAsync(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors
        });
      } else {
        next(error);
      }
    }
  };
}; 