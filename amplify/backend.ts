import { defineBackend } from "@aws-amplify/backend";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { auth } from "./auth/resource";
import { data } from "./data/resource";

/**
 * YARTX Amplify Gen2 后端入口。
 * T2：Auth（三组）+ Data schema；后续 T5+ 在此挂 Function URL / Streams 消费端。
 */
const backend = defineBackend({
  auth,
  data,
});

// 方便 CLI / curl 验收（USER_PASSWORD_AUTH）；前端 SDK 仍走 SRP。
const { cfnUserPoolClient } = backend.auth.resources.cfnResources;
cfnUserPoolClient.explicitAuthFlows = [
  "ALLOW_USER_PASSWORD_AUTH",
  "ALLOW_USER_SRP_AUTH",
  "ALLOW_REFRESH_TOKEN_AUTH",
  "ALLOW_CUSTOM_AUTH",
];

// T13 ETL 需要 Streams：对所有业务表打开 NEW_AND_OLD_IMAGES
const tables = backend.data.resources.cfnResources.amplifyDynamoDbTables;
for (const name of Object.keys(tables)) {
  tables[name].streamSpecification = {
    streamViewType: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
  };
}

export { backend };
