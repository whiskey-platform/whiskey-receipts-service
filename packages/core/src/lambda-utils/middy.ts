import { Handler } from 'aws-lambda';
import middy from '@middy/core';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logger } from '../utils/logger';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { tracer } from '../utils/tracer';

const isLocal = !!process.env.IS_LOCAL;

export const wrapped = (handler: Handler) =>
  middy(handler)
    .use(injectLambdaContext(logger, { logEvent: !isLocal }))
    .use(captureLambdaHandler(tracer));
