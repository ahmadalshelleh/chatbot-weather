import { Request, Response } from 'express';
import mongoose from 'mongoose';

export class HealthController {
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     description: Check if the API is running and MongoDB is connected
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 database:
   *                   type: object
   *                   properties:
   *                     connected:
   *                       type: boolean
   *                       example: true
   *                     state:
   *                       type: string
   *                       example: connected
   *       503:
   *         description: Service unavailable (database not connected)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: degraded
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 database:
   *                   type: object
   *                   properties:
   *                     connected:
   *                       type: boolean
   *                       example: false
   *                     state:
   *                       type: string
   *                       example: disconnected
   */
  async health(req: Request, res: Response): Promise<void> {
    const dbState = mongoose.connection.readyState;
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const isConnected = dbState === 1;

    const healthStatus = {
      status: isConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        connected: isConnected,
        state: dbStates[dbState] || 'unknown'
      }
    };

    // Return 503 if database is not connected
    const statusCode = isConnected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  }
}

