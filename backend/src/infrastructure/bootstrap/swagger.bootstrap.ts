import swaggerJSDoc from 'swagger-jsdoc';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../../config/env.js';

/**
 * Generates the OpenAPI spec from `@openapi` JSDoc comments on route files and serves
 * Swagger UI at /api-docs. Coverage is incremental — not every endpoint is annotated yet,
 * starting with auth, bookings, instant-requests, and payments as the pattern to extend.
 */
const spec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SHRAM API',
      version: '1.0.0',
      description: 'Provider/Worker marketplace API — Booking is the aggregate root of the domain.',
    },
    servers: [{ url: '/api/v1', description: 'API base path' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errorCode: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    'src/modules/auth/routes/*.ts',
    'src/modules/bookings/routes/*.ts',
    'src/modules/instant-requests/routes/*.ts',
    'src/modules/payments/routes/*.ts',
    'src/modules/chat/routes/*.ts',
  ],
});

export function mountSwagger(app: Express): void {
  if (env.NODE_ENV === 'production') {
    // Keep the API surface private in production until auth-gating this route is decided.
    return;
  }
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}
