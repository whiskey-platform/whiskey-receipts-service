import { StackContext, Api, use, ApiDomainProps } from 'sst/constructs';
import { DomainName } from '@aws-cdk/aws-apigatewayv2-alpha';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Infra } from './Infra';

export function API({ stack, app }: StackContext) {
  const { DATABASE_URL, bucket, AUTH_BASE_URL } = use(Infra);
  let customDomain: ApiDomainProps | undefined;
  if (!app.local && app.stage !== 'local') {
    customDomain = {
      path: 'receipts',
      cdk: {
        domainName: DomainName.fromDomainNameAttributes(stack, 'ApiDomain', {
          name: StringParameter.valueFromLookup(
            stack,
            `/sst-outputs/${app.stage}-api-infra-Infra/domainName`
          ),
          regionalDomainName: StringParameter.valueFromLookup(
            stack,
            `/sst-outputs/${app.stage}-api-infra-Infra/regionalDomainName`
          ),
          regionalHostedZoneId: StringParameter.valueFromLookup(
            stack,
            `/sst-outputs/${app.stage}-api-infra-Infra/regionalHostedZoneId`
          ),
        }),
      },
    };
  }
  const api = new Api(stack, 'api', {
    routes: {
      'POST /receipts': 'packages/api/src/functions/upload-receipt.handler',
      'PUT /receipts/{id}': 'packages/api/src/functions/update-receipt.handler',
      'DELETE /receipts/{id}': 'packages/api/src/functions/delete-receipt.handler',
      'GET /receipts': 'packages/api/src/functions/get-receipts.handler',
      'GET /receipts/download-url': 'packages/api/src/functions/get-download-url.handler',
    },
    customDomain,
  });

  api.bind([DATABASE_URL, AUTH_BASE_URL, bucket]);
}
