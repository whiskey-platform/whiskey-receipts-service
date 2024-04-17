import { NoSuchKey } from '@aws-sdk/client-s3';
import { S3Service, db, logger, wrapped, Event, SNSService } from '@whiskey-receipts-service/core';
import { Handler } from 'aws-lambda';
import { difference } from 'lodash';
import { extension } from 'mime-types';
import { Bucket } from 'sst/node/bucket';
import { Topic } from 'sst/node/topic';

const s3 = S3Service.live();
const sns = SNSService.live();

const cleanupReceiptDocuments: Handler = async event => {
  // retrieve all receipt ids and mimetypes
  logger.info('Begin receipt cleanup job');
  logger.debug('Retrieving all receipts from database');
  const receipts = await db
    .selectFrom('whiskey-receipts.receipts')
    .leftJoin(
      'whiskey-receipts.stores',
      'whiskey-receipts.stores.id',
      'whiskey-receipts.receipts.store_id'
    )
    .select([
      'whiskey-receipts.receipts.id as id',
      'whiskey-receipts.stores.id as store_id',
      'whiskey-receipts.stores.name as store_name',
      'whiskey-receipts.receipts.timestamp as timestamp',
      'whiskey-receipts.receipts.document_type as document_type',
    ])
    .execute();
  // retrieve all S3 documents
  logger.info('Retrieving all S3 documents');
  const documents = await s3.retrieveAllObjects(Bucket.ReceiptsBucket.bucketName);
  // if s3 has document not in receipts database, delete it
  logger.info('Finding differences');
  const deleted = difference(
    documents.map(v => v.Key!),
    receipts.map(v => `${v.id}.${extension(v.document_type)}`)
  );
  logger.info(`Deleting ${deleted.length} extraneous documents`);
  await s3.deleteObjects(deleted, Bucket.ReceiptsBucket.bucketName);

  logger.info('Finding receipts with blank data');
  const noDataIds = [];
  for (const receipt of receipts) {
    try {
      const head = await s3.objectHead(
        `${receipt.id}.${extension(receipt.document_type)}`,
        Bucket.ReceiptsBucket.bucketName
      );
      if (head.ContentLength === 0) {
        noDataIds.push(receipt);
      }
    } catch (error) {
      if (error as NoSuchKey) {
        noDataIds.push(receipt);
      } else {
        throw error;
      }
    }
  }

  logger.info(`Found ${noDataIds.length} receipts with no data. Cleaning up now...`);
  await db
    .deleteFrom('whiskey-receipts.receipts')
    .where(
      'id',
      'in',
      noDataIds.map(v => v.id)
    )
    .execute();
  logger.info('Deleted receipts with no data');

  const deletedEvents: { id: string; payload: Event }[] = noDataIds.map(v => ({
    id: v.id,
    payload: {
      action: 'DELETE',
      details: {
        id: v.id,
        documentType: v.document_type,
        store: v.store_name!,
        timestamp: v.timestamp.getTime(),
      },
    },
  }));
  await sns.batchEvents(deletedEvents, Topic.EventsTopic.topicArn);
  logger.info(`Notified topic of ${deletedEvents.length} DELETE events`);
};

export const handler = wrapped(cleanupReceiptDocuments);
