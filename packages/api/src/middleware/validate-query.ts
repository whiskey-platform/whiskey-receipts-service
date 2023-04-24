import { MiddlewareObj } from '@middy/core';
import { logger } from '@whiskey-receipts-service/core';
import Ajv, { JSONSchemaType } from 'ajv';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

export function validateQuery<S>(schema: JSONSchemaType<S>): MiddlewareObj<APIGatewayProxyEventV2> {
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  return {
    before: async request => {
      logger.info('Validating request body');
      if (!validate(request.event.queryStringParameters))
        throw {
          message: 'Validation error',
          status: 400,
          cause: validate.errors,
        };
    },
  };
}
