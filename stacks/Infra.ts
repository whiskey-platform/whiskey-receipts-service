import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Bucket, Config, Stack, StackContext, Table, Topic } from 'sst/constructs';

export const Infra = ({ stack }: StackContext) => {
  const bucket = new Bucket(stack, 'ReceiptsBucket');
  bucket.addNotifications(stack, {
    onAddReceipt: 'packages/functions/src/receipt-document-added.handler',
  });
  bucket.bind([bucket]);
  const DATABASE_URL = new Config.Secret(stack, 'DATABASE_URL');
  bucket.bind([DATABASE_URL]);

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

  const eventsTable = new Table(stack, 'EventsTable', {
    fields: {
      timestamp: 'number',
    },
    primaryIndex: {
      partitionKey: 'timestamp',
    },
  });
  const eventsTopic = new Topic(stack, 'EventsTopic', {
    subscribers: {
      addToTable: 'packages/functions/src/add-event-to-table.handler',
    },
  });
  eventsTopic.bind([eventsTable, DATABASE_URL]);
  bucket.bind([eventsTopic]);

  const topic = new Topic(stack, 'Topic', {
    subscribers: {
      subscriber: 'packages/functions/src/handle-ingest-event.handler',
    },
    defaults: {
      function: {
        bind: [DATABASE_URL, bucket, notificationsTopic, eventsTopic],
        permissions: ['s3'],
      },
    },
  });

  return {
    bucket,
    DATABASE_URL,
    AUTH_BASE_URL,
    notificationsTopic,
    eventsTopic,
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
