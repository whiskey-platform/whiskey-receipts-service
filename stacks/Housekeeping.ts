import { Cron, Function, StackContext, use } from 'sst/constructs';
import { Infra } from './Infra';

export const Housekeeping = ({ stack }: StackContext) => {
  const { bucket, DATABASE_URL, documentIngestTopic, powertools } = use(Infra);
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
  cleanupReceiptDocuments.bind([bucket, DATABASE_URL]);

  new Function(stack, 'MigrateOldReceipts', {
    handler: 'packages/functions/src/housekeeping/migrate-old-receipts.handler',
    bind: [bucket, DATABASE_URL],
    permissions: ['s3', 'dynamodb'],
    layers: [powertools],
  });

  new Function(stack, 'SendReceiptsToDocuments', {
    handler: 'packages/functions/src/housekeeping/send-receipts-to-documents.handler',
    bind: [bucket, DATABASE_URL, documentIngestTopic],
    layers: [powertools],
  });

  new Function(stack, 'DeduplicateReceipts', {
    handler: 'packages/functions/src/housekeeping/deduplicate-receipts.handler',
    bind: [DATABASE_URL],
    layers: [powertools],
  });
};
