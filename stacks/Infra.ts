import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Bucket, Config, StackContext, Topic } from 'sst/constructs';

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

  const notificationsTopic = new Topic(stack, 'NotificationsTopic', {
    cdk: {
      topic: sns.Topic.fromTopicArn(
        stack,
        'ExistingNotificationsTopic',
        StringParameter.valueFromLookup(
          stack,
          `/sst/push-notifications/${stack.stage}/Topic/NotificationsTopic/topicArn`
        )
      ),
    },
  });

  return {
    bucket,
    DATABASE_URL,
    AUTH_BASE_URL,
    notificationsTopic,
  };
};
