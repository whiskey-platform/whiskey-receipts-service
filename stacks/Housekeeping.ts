import { Cron, Function, StackContext, use } from 'sst/constructs';
import { Infra } from './Infra';
import { EventHandling } from './Events';

export const Housekeeping = ({ stack }: StackContext) => {
  const { bucket, DATABASE_URL, powertools } = use(Infra);
  const { eventsTopic } = use(EventHandling);
  const cleanupReceiptDocuments = new Cron(stack, 'CleanupReceiptDocuments', {
    job: {
      function: {
        handler: 'packages/functions/src/housekeeping/cleanup-receipt-documents.handler',
        timeout: '10 minutes',
        layers: [powertools],
      },
    },
    schedule: 'rate(7 days)',
  });
  cleanupReceiptDocuments.bind([bucket, DATABASE_URL, eventsTopic]);

  new Function(stack, 'MigrateOldReceipts', {
    handler: 'packages/functions/src/housekeeping/migrate-old-receipts.handler',
    bind: [bucket, DATABASE_URL],
    permissions: ['s3', 'dynamodb'],
    layers: [powertools],
  });

  new Function(stack, 'RefreshReceipts', {
    handler: 'packages/functions/src/housekeeping/send-receipts-to-documents.handler',
    bind: [bucket, DATABASE_URL, eventsTopic],
    layers: [powertools],
  });

  new Function(stack, 'DeduplicateReceipts', {
    handler: 'packages/functions/src/housekeeping/deduplicate-receipts.handler',
    bind: [DATABASE_URL, eventsTopic],
    layers: [powertools],
  });
};
