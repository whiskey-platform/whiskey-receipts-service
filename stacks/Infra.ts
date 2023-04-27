import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Bucket, Config, StackContext } from 'sst/constructs';

export const Infra = ({ stack }: StackContext) => {
  const bucket = new Bucket(stack, 'ReceiptsBucket');
  const DATABASE_URL = new Config.Secret(stack, 'DATABASE_URL');

  const apiBaseUrl = StringParameter.valueFromLookup(
    stack,
    `/sst/auth-service/${stack.stage}/Api/api/url`
  );
  const AUTH_BASE_URL = new Config.Parameter(stack, 'AUTH_BASE_URL', {
    value: `${apiBaseUrl}`,
  });

  return {
    bucket,
    DATABASE_URL,
    AUTH_BASE_URL,
  };
};
