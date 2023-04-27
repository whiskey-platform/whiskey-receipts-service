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

  const NOTIFICATIONS_TOPIC_ARN = new Config.Parameter(stack, 'NOTIFICATIONS_TOPIC_ARN', {
    value: StringParameter.valueFromLookup(
      stack,
      `/sst/push-notifications/${stack.stage}/Topic/NotificationsTopic/topicArn`
    ),
  });

  return {
    bucket,
    DATABASE_URL,
    AUTH_BASE_URL,
    NOTIFICATIONS_TOPIC_ARN,
  };
};
