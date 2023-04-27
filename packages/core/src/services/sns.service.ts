import { MessageAttributeValue, PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { logger } from '../utils/logger';

const snsClient = new SNSClient({ region: process.env.AWS_REGION });

export class SNSService {
  private snsClient: SNSClient;

  constructor(snsClient: SNSClient) {
    this.snsClient = snsClient;
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
    await snsClient.send(snsReq);
    logger.info(`Successfully published event to SNS`);
  }
}
