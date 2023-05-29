/* eslint-disable */

import Ajv from "ajv";

import { Decoder } from "./helpers";
import { validateJson } from "./validate";
import {
  PostReceiptsRequestBody,
  PutReceiptsRequestBody,
  GetReceiptsResponseBodyItem,
  ErrorSchema,
} from "./models";
import jsonSchema from "./schema.json";

const ajv = new Ajv({ strict: false });
ajv.compile(jsonSchema);

// Decoders
export const PostReceiptsRequestBodyDecoder: Decoder<PostReceiptsRequestBody> =
  {
    definitionName: "PostReceiptsRequestBody",
    schemaRef: "#/definitions/PostReceiptsRequestBody",

    decode(json: unknown): PostReceiptsRequestBody {
      const schema = ajv.getSchema(PostReceiptsRequestBodyDecoder.schemaRef);
      if (!schema) {
        throw new Error(
          `Schema ${PostReceiptsRequestBodyDecoder.definitionName} not found`
        );
      }
      return validateJson(
        json,
        schema,
        PostReceiptsRequestBodyDecoder.definitionName
      );
    },
  };
export const PutReceiptsRequestBodyDecoder: Decoder<PutReceiptsRequestBody> = {
  definitionName: "PutReceiptsRequestBody",
  schemaRef: "#/definitions/PutReceiptsRequestBody",

  decode(json: unknown): PutReceiptsRequestBody {
    const schema = ajv.getSchema(PutReceiptsRequestBodyDecoder.schemaRef);
    if (!schema) {
      throw new Error(
        `Schema ${PutReceiptsRequestBodyDecoder.definitionName} not found`
      );
    }
    return validateJson(
      json,
      schema,
      PutReceiptsRequestBodyDecoder.definitionName
    );
  },
};
export const GetReceiptsResponseBodyItemDecoder: Decoder<GetReceiptsResponseBodyItem> =
  {
    definitionName: "GetReceiptsResponseBodyItem",
    schemaRef: "#/definitions/GetReceiptsResponseBodyItem",

    decode(json: unknown): GetReceiptsResponseBodyItem {
      const schema = ajv.getSchema(
        GetReceiptsResponseBodyItemDecoder.schemaRef
      );
      if (!schema) {
        throw new Error(
          `Schema ${GetReceiptsResponseBodyItemDecoder.definitionName} not found`
        );
      }
      return validateJson(
        json,
        schema,
        GetReceiptsResponseBodyItemDecoder.definitionName
      );
    },
  };
export const ErrorSchemaDecoder: Decoder<ErrorSchema> = {
  definitionName: "ErrorSchema",
  schemaRef: "#/definitions/ErrorSchema",

  decode(json: unknown): ErrorSchema {
    const schema = ajv.getSchema(ErrorSchemaDecoder.schemaRef);
    if (!schema) {
      throw new Error(`Schema ${ErrorSchemaDecoder.definitionName} not found`);
    }
    return validateJson(json, schema, ErrorSchemaDecoder.definitionName);
  },
};
