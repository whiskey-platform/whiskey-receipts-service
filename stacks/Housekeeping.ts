import { Cron, StackContext, use } from 'sst/constructs';
import { Infra } from './Infra';

export const Housekeeping = ({ stack }: StackContext) => {
  const { bucket, DATABASE_URL } = use(Infra);
  const cleanupReceiptDocuments = new Cron(stack, 'CleanupReceiptDocuments', {
    job: 'packages/functions/src/housekeeping/cleanup-receipt-documents.handler',
    schedule: 'rate(7 days)',
  });
  cleanupReceiptDocuments.bind([bucket, DATABASE_URL]);
};
