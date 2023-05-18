import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Bucket, Config, Stack, StackContext, Topic } from 'sst/constructs';

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
        ssmArn(`/sst/push-notifications/${stack.stage}/Topic/NotificationsTopic/topicArn`, stack)
      ),
    },
  });

  const documentIngestTopic = new Topic(stack, 'DocumentIngestTopic', {
    cdk: {
      topic: sns.Topic.fromTopicArn(
        stack,
        'ExistingDocumentIngestTopic',
        ssmArn(
          `/sst/whiskeyhub-document-service/${stack.stage}/Topic/DocumentIngestTopic/topicArn`,
          stack
        )
      ),
    },
  });

  return {
    bucket,
    DATABASE_URL,
    AUTH_BASE_URL,
    notificationsTopic,
    documentIngestTopic,
  };
};

function ssmArn(name: string, stack: Stack): string {
  const arnLookup = StringParameter.valueFromLookup(stack, name);
  let arnLookupValue: string;
  if (arnLookup.includes('dummy-value')) {
    arnLookupValue = stack.formatArn({
      service: 'sns',
      resource: 'topic',
      resourceName: arnLookup,
    });
  } else {
    arnLookupValue = arnLookup;
  }
  return arnLookupValue;
}
