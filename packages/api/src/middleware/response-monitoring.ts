/* eslint-disable @typescript-eslint/no-explicit-any */

import middy from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { APIGatewayJSONBodyEvent } from '../utils/lambda-utils';
import { logger } from '@whiskey-receipts-service/core';

export interface IError {
  status: number;
  message: string;
  details?: any;
  cause: any;
}

type APIGatewayEvent<S> = APIGatewayProxyEventV2 | APIGatewayJSONBodyEvent<S>;

const responseMonitoring = <S>(): middy.MiddlewareObj<
  APIGatewayEvent<S>,
  APIGatewayProxyResultV2
> => {
  const after: middy.MiddlewareFn<APIGatewayEvent<S>, APIGatewayProxyResultV2> = request => {
    if (!process.env.IS_LOCAL) logger.debug('API Gateway Response', { response: request.response });
  };

  const onError: middy.MiddlewareFn<
    APIGatewayEvent<S>,
    APIGatewayProxyResultV2,
    IError | Error
  > = request => {
    logger.error('error', { error: request.error });
    if (request.error as IError) {
      const error = request.error as IError;
      logger.error(error.message, { details: error.details });
      request.response = {
        statusCode: error.status,
        body: JSON.stringify({
          message: error.message,
          details: error.details ?? error.cause,
          trackingId: request.context.awsRequestId,
        }),
      };
    } else {
      const error = request.error as Error;
      logger.error(error.message, { stack: error.stack });
    }
  };

  return {
    after,
    onError,
  };
};

export default responseMonitoring;
