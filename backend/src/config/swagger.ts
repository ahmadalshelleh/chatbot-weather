import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerUiOptions } from 'swagger-ui-express';

const isDevelopment = process.env.NODE_ENV === 'development';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chatbot API',
      version: '1.0.0',
      description: 'Multi-LLM Weather Chatbot API with tool calling support',
      contact: {
        name: 'API Support',
        email: 'support@chatbot.com'
      }
    },
    servers: isDevelopment ? [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: 'Development server'
      }
    ] : [
      {
        url: 'http://63.180.58.146',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Message: {
          type: 'object',
          required: ['role', 'content'],
          properties: {
            role: {
              type: 'string',
              enum: ['user', 'assistant', 'system', 'tool'],
              description: 'Role of the message sender'
            },
            content: {
              type: 'string',
              nullable: true,
              description: 'Message content'
            },
            toolCalls: {
              type: 'array',
              items: { $ref: '#/components/schemas/ToolCall' }
            },
            toolCallId: {
              type: 'string',
              description: 'ID of the tool call this message responds to'
            }
          }
        },
        ToolCall: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique tool call identifier'
            },
            name: {
              type: 'string',
              description: 'Name of the tool to call'
            },
            arguments: {
              type: 'object',
              description: 'Arguments for the tool call'
            }
          }
        },
        ChatRequest: {
          type: 'object',
          required: ['messages', 'model'],
          properties: {
            messages: {
              type: 'array',
              items: { $ref: '#/components/schemas/Message' },
              description: 'Array of conversation messages'
            },
            model: {
              type: 'string',
              enum: ['openai', 'anthropic', 'deepseek'],
              description: 'LLM provider to use'
            },
            maxIterations: {
              type: 'integer',
              default: 5,
              description: 'Maximum number of tool calling iterations'
            }
          }
        },
        ChatResponse: {
          type: 'object',
          properties: {
            response: {
              type: 'string',
              description: 'Final response from the chatbot'
            },
            toolCallsMade: {
              type: 'array',
              items: { $ref: '#/components/schemas/ToolCall' },
              description: 'List of tools that were called'
            },
            modelUsed: {
              type: 'string',
              description: 'LLM provider that was used'
            }
          }
        },
        Model: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Model identifier'
            },
            name: {
              type: 'string',
              description: 'Human-readable model name'
            },
            provider: {
              type: 'string',
              description: 'Provider name'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            stack: {
              type: 'string',
              description: 'Stack trace (only in development)'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Chat',
        description: 'Chat endpoints for interacting with the chatbot'
      },
      {
        name: 'Models',
        description: 'Available LLM models'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/server.ts']
};

export const swaggerSpec = swaggerJsdoc(options);

// Debug: Log the paths being used
console.log('📝 Swagger API paths:', options.apis);
console.log('📊 Swagger spec paths found:', Object.keys((swaggerSpec as any).paths || {}));

export const swaggerUiOptions: SwaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Chatbot API Documentation'
};
