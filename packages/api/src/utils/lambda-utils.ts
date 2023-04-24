import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Handler } from 'aws-lambda';

export type APIGatewayJSONBodyEvent<S> = Omit<APIGatewayProxyEventV2, 'body'> & {
  body: S;
};

export type APIGatewayJSONBodyEventHandler<S> = Handler<
  APIGatewayJSONBodyEvent<S>,
  APIGatewayProxyResultV2
>;

export const json = (response: Record<string, unknown>): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  body: JSON.stringify(response),
});
