import { Bucket, Config, StackContext } from 'sst/constructs';

export const Infra = ({ stack }: StackContext) => {
  const bucket = new Bucket(stack, 'ReceiptsBucket');
  const DATABASE_URL = new Config.Secret(stack, 'DATABASE_URL');

  stack.addOutputs({
    BucketName: bucket.bucketName,
  });

  return {
    bucket,
    DATABASE_URL,
  };
};
