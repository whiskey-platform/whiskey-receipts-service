import { Bucket, Config, StackContext } from 'sst/constructs';

export const Infra = ({ stack }: StackContext) => {
  const bucket = new Bucket(stack, 'ReceiptsBucket');
  const DATABASE_URL = new Config.Secret(stack, 'DATABASE_URL');
  const AUTH_BASE_URL = new Config.Parameter(stack, 'AUTH_BASE_URL', {
    value: `https://${process.env.API_DOMAIN_NAME}/auth`,
  });

  stack.addOutputs({
    BucketName: bucket.bucketName,
  });

  return {
    bucket,
    DATABASE_URL,
    AUTH_BASE_URL,
  };
};
