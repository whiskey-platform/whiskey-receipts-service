import {
  MessageAttributeValue,
  PublishBatchCommand,
  PublishCommand,
  SNSClient,
} from '@aws-sdk/client-sns';
import { logger } from '../utils/logger';
import { chunk } from 'lodash';
import { tracer } from '../utils/tracer';
export class SNSService {
  private snsClient: SNSClient;

  constructor(snsClient: SNSClient) {
    this.snsClient = snsClient;
    tracer.captureAWSv3Client(this.snsClient);
  }
  public static live = () => new SNSService(new SNSClient({ region: process.env.AWS_REGION }));

  public async publishEvent(
    event: any,
    topicArn: string,
    attributes?: Record<string, MessageAttributeValue>
  ): Promise<void> {
    logger.info(`Publishing event to SNS`, { event, topicArn });
    const snsReq = new PublishCommand({
      Message: JSON.stringify(event),
      TopicArn: topicArn,
      MessageAttributes: attributes,
    });
    await this.snsClient.send(snsReq);
    logger.info(`Successfully published event to SNS`);
  }

  public async batchEvents(
    events: { id: string; payload: any }[],
    TopicArn: string
  ): Promise<void> {
    for (const group of chunk(events, 10)) {
      const snsReq = new PublishBatchCommand({
        PublishBatchRequestEntries: group.map(val => ({
          Id: val.id,
          Message: JSON.stringify(val.payload),
        })),
        TopicArn,
      });
      await this.snsClient.send(snsReq);
    }
    logger.info(`Successfully published events to SNS`);
  }
}
