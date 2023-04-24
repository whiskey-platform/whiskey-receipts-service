/* eslint-disable */
import {
  PostReceiptsRequestBody,
  GetReceiptsResponseBodyItem,
  ErrorSchema,
} from "./models";

export const schemaDefinitions = {
  PostReceiptsRequestBody: info<PostReceiptsRequestBody>(
    "PostReceiptsRequestBody",
    "#/definitions/PostReceiptsRequestBody"
  ),
  GetReceiptsResponseBodyItem: info<GetReceiptsResponseBodyItem>(
    "GetReceiptsResponseBodyItem",
    "#/definitions/GetReceiptsResponseBodyItem"
  ),
  ErrorSchema: info<ErrorSchema>("ErrorSchema", "#/definitions/ErrorSchema"),
};

export interface SchemaInfo<T> {
  definitionName: string;
  schemaRef: string;
}

function info<T>(definitionName: string, schemaRef: string): SchemaInfo<T> {
  return { definitionName, schemaRef };
}
