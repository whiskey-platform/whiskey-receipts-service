import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  PutObjectCommand,
  S3Client,
  _Object,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extension } from 'mime-types';
import { chunk } from 'lodash';
import { logger } from '../utils/logger';

export class S3Service {
  objectKey = (id: string, contentType: string): string => `${id}.${extension(contentType)}`;

  private s3Client!: S3Client;
  private getSignedUrlFunc!: typeof getSignedUrl;

  constructor(s3Client: S3Client, getSignedUrlFunc: typeof getSignedUrl) {
    this.s3Client = s3Client;
    this.getSignedUrlFunc = getSignedUrlFunc;
  }
  public static live = (): S3Service =>
    new S3Service(new S3Client({ region: process.env.AWS_REGION }), getSignedUrl);

  public async getUploadLink(Key: string, Bucket: string, ContentType: string): Promise<string> {
    const request = new PutObjectCommand({
      Bucket,
      Key,
      ContentType,
    });
    //Logger.info('Request to S3', { request });

    const url = await this.getSignedUrlFunc(this.s3Client, request, {
      expiresIn: 3600,
    });
    //Logger.info('Request to S3 successful', { uploadURL: url });
    return url;
  }

  public async getObjectURL(Key: string, Bucket: string): Promise<string> {
    const getObjectRequest = new GetObjectCommand({
      Bucket,
      Key,
    });
    const url = await this.getSignedUrlFunc(this.s3Client, getObjectRequest, {
      expiresIn: 3600,
    });
    //Logger.info('Request to S3 successful', { objectURL: url });
    return url;
  }

  public async copyObject(CopySource: string, Bucket: string, Key: string) {
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    logger.info(`Copying ${CopySource} to ${Bucket}/${Key}`);
    const copyRequest = new CopyObjectCommand({
      Bucket,
      CopySource,
      Key,
    });
    await s3Client.send(copyRequest);
  }

  public async retrieveAllObjects(Bucket: string) {
    let ContinuationToken: string | undefined = undefined;
    const objects: _Object[] = [];
    const baseRequest: ListObjectsV2CommandInput = {
      Bucket,
    };
    do {
      if (ContinuationToken !== undefined) baseRequest.ContinuationToken = ContinuationToken;
      const getRequest = new ListObjectsV2Command(baseRequest);
      const response = await this.s3Client.send(getRequest);
      objects.push(...(response.Contents ?? []));
      ContinuationToken = response.NextContinuationToken;
    } while (ContinuationToken !== undefined);
    return objects;
  }

  public async deleteObjects(keys: string[], Bucket: string) {
    const groupedKeys = chunk(keys, 1000);
    for (const group of groupedKeys) {
      const deleteRequest = new DeleteObjectsCommand({
        Bucket,
        Delete: {
          Objects: group.map(Key => ({
            Key,
          })),
        },
      });
      await this.s3Client.send(deleteRequest);
    }
  }
}
