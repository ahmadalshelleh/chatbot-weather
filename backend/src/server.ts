import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase } from './config/database';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import chatRoutes from './routes/chat.routes';
import modelsRoutes from './routes/models.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions));
app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Routes
app.use('/api', chatRoutes);
app.use('/api', modelsRoutes);
app.use('/', healthRoutes);

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`📄 OpenAPI Spec: http://localhost:${PORT}/api-docs.json`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
