import { StackContext, Api, Config } from 'sst/constructs';

export function API({ stack }: StackContext) {
  const DATABASE_URL = new Config.Secret(stack, 'DATABASE_URL');
  const api = new Api(stack, 'api', {
    routes: {
      'GET /': 'packages/functions/src/lambda.handler',
    },
  });
  api.bind([DATABASE_URL]);
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
