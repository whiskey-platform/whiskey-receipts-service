import { StackContext, Topic, use } from 'sst/constructs';
import { Infra } from './Infra';
import { Tags } from 'aws-cdk-lib';

export const EventHandling = ({ stack }: StackContext) => {
  const { DATABASE_URL, bucket, notificationsTopic } = use(Infra);
  const topic = new Topic(stack, 'Topic', {
    subscribers: {
      subscriber: 'packages/functions/src/handle-ingest-event.handler',
    },
    defaults: {
      function: {
        bind: [DATABASE_URL, bucket, notificationsTopic],
      },
    },
  });

  stack.addOutputs({
    SubscriberFunctionArn: topic.subscriberFunctions[0].functionArn,
    SubscriberFunctionRoleArn: topic.subscriberFunctions[0].role?.roleArn ?? '',
  });
};
