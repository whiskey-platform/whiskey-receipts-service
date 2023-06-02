import { StackContext, Table, Topic, use } from 'sst/constructs';
import { Infra } from './Infra';

export const EventHandling = ({ stack }: StackContext) => {
  const { DATABASE_URL, bucket, notificationsTopic } = use(Infra);

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
  bucket.attachPermissions(['sns']);

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
    eventsTopic,
  };
};
