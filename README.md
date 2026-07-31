# YARTX-Backend

Amplify Gen2 后端（Auth + Data）。环境与密钥约定见 monorepo `infrastructure/ENV.md`。

## 本地 sandbox（T2）

```bash
export AWS_PROFILE=default   # 当前 sandbox 用账号 214737777196 / us-east-1
cd backend
npm i
npm run sandbox              # 持续；或 npm run sandbox:once
```

成功后根目录生成 `amplify_outputs.json`（已 gitignore）。越权验收记录：[`docs/AUTHZ_CHECK.md`](docs/AUTHZ_CHECK.md)。

### Cognito 三组

| 组 | 用途 |
|---|---|
| `collector` | 海外买家 |
| `maker` | 艺术家 |
| `admin` | 运营 / 策展 |

MFA：可选 TOTP（无短信）。

### 建测试用户并加入组

```bash
POOL_ID=$(jq -r '.auth.user_pool_id' amplify_outputs.json)
REGION=$(jq -r '.auth.aws_region' amplify_outputs.json)

for PAIR in "collector:collector@yartx.test" "maker:maker@yartx.test" "admin:admin@yartx.test"; do
  GROUP=${PAIR%%:*}; EMAIL=${PAIR##*:}
  aws cognito-idp admin-create-user \
    --user-pool-id "$POOL_ID" --username "$EMAIL" \
    --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
    --temporary-password 'TempPass1!' --message-action SUPPRESS --region "$REGION"
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$POOL_ID" --username "$EMAIL" \
    --password 'TestPass1!' --permanent --region "$REGION"
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$POOL_ID" --username "$EMAIL" \
    --group-name "$GROUP" --region "$REGION"
done
```

### 授权要点

- `Artwork` / `Artist`：**create 仅 `maker`**；**update/delete 仅 owner**；`admin` 全权；guest/登录可读。
- group-create **不会**自动填 `owner`——客户端 create 时必须带 `owner: <cognito sub>`，否则本人无法再改。
- `Order` GraphQL 侧买家只读；建单留给 `shop-api`（T5，IAM `allow.resource`）。
- 「只读在售」：鉴权放行 read，列表用 `status = 在售` 筛选。

## 数据约定

- 金额：USD **cent** 整数
- 状态：中文原文字符串
- DynamoDB Streams：`NEW_AND_OLD_IMAGES`（给 T13）
