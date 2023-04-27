import { S3Service, db } from '@whiskey-receipts-service/core';
import { Handler } from 'aws-lambda';
import { difference } from 'lodash';
import { extension } from 'mime-types';
import { Bucket } from 'sst/node/bucket';

const s3 = S3Service.live();

export const handler: Handler = async event => {
  // retrieve all receipt ids and mimetypes
  const receipts = await db.selectFrom('receipts').select(['id', 'document_type']).execute();
  // retrieve all S3 documents
  const documents = await s3.retrieveAllObjects(Bucket.ReceiptsBucket.bucketName);
  // if s3 has document not in receipts database, delete it
  const deleted = difference(
    documents.map(v => v.Key!),
    receipts.map(v => `${v.id}.${extension(v.document_type)}`)
  );

  await s3.deleteObjects(deleted, Bucket.ReceiptsBucket.bucketName);
};
