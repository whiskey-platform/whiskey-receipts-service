import { StackContext, Table, Topic, use } from 'sst/constructs';
import { Infra } from './Infra';

export const EventHandling = ({ stack }: StackContext) => {
  const { DATABASE_URL, bucket, notificationsTopic, powertools } = use(Infra);

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
  eventsTopic.bind([eventsTable]);

  const topic = new Topic(stack, 'Topic', {
    subscribers: {
      subscriber: 'packages/functions/src/handle-ingest-event.handler',
    },
    defaults: {
      function: {
        bind: [DATABASE_URL, bucket, notificationsTopic, eventsTopic],
        layers: [powertools],
        permissions: ['s3'],
      },
    },
  });

  stack.addOutputs({
    SubscriberFunctionArn: topic.subscriberFunctions[0].functionArn,
    SubscriberFunctionRoleArn: topic.subscriberFunctions[0].role?.roleArn ?? '',
  });

  return {
    eventsTopic,
  };
};
