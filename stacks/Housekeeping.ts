import { Cron, Function, StackContext, use } from 'sst/constructs';
import { Infra } from './Infra';
import { Tags } from 'aws-cdk-lib';

export const Housekeeping = ({ stack }: StackContext) => {
  const { bucket, DATABASE_URL, documentIngestTopic } = use(Infra);
  const cleanupReceiptDocuments = new Cron(stack, 'CleanupReceiptDocuments', {
    job: {
      function: {
        handler: 'packages/functions/src/housekeeping/cleanup-receipt-documents.handler',
        timeout: '10 minutes',
      },
    },
    schedule: 'rate(7 days)',
  });
  cleanupReceiptDocuments.bind([bucket, DATABASE_URL]);

  new Function(stack, 'MigrateOldReceipts', {
    handler: 'packages/functions/src/housekeeping/migrate-old-receipts.handler',
    bind: [bucket, DATABASE_URL],
    permissions: ['s3', 'dynamodb'],
  });

  new Function(stack, 'SendReceiptsToDocuments', {
    handler: 'packages/functions/src/housekeeping/send-receipts-to-documents.handler',
    bind: [bucket, DATABASE_URL, documentIngestTopic],
  });
};
