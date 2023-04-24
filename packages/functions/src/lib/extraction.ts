import { SNSMessage, SQSRecord } from 'aws-lambda';
import { Input } from './models/input';

export const extractSNSMessage = (record: SQSRecord): SNSMessage => {
  const bodyString = record.body;
  return JSON.parse(bodyString);
};

export const extractInput = (message: SNSMessage): Input => {
  const bodyString = message.Message;
  return JSON.parse(bodyString);
};
