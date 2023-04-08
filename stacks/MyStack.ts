import { StackContext, Api, Config, Bucket } from 'sst/constructs';

export function API({ stack }: StackContext) {
  const bucket = new Bucket(stack, 'ReceiptsBucket');
  const DATABASE_URL = new Config.Secret(stack, 'DATABASE_URL');
  const api = new Api(stack, 'api', {
    routes: {
      'GET /': 'packages/functions/src/lambda.handler',
    },
  });
  api.bind([DATABASE_URL, bucket]);
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
