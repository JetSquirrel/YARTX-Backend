# T2 · 授权越权验收记录

> sandbox User Pool: `us-east-1_56AVQGgoP`  
> AppSync: `https://uwiqejucqfbqbmbtzno4kl3hd4.appsync-api.us-east-1.amazonaws.com/graphql`  
> 时间：2026-07-31T12:54:00Z · AWS `214737777196` / `us-east-1`

测试用户（仅 sandbox）：

| 组 | 邮箱 |
|---|---|
| collector | collector@yartx.test |
| maker | maker@yartx.test |
| admin | admin@yartx.test |

规则：`Artwork` / `Artist` 的 **create 仅 `maker` 组**；**update/delete 走 owner**（create 时客户端必须写入 `owner = cognito sub`，因 group-create 不会自动填）；`admin` 全权。访客 / 登录用户可读作品。「只读在售」靠 `status` 筛选（应用层 / GSI），鉴权层放行 read。

---

## TEST1 collector createArtwork

**期望**：拒绝

```json
{
  "errors": [
    {
      "errorType": "Unauthorized",
      "message": "Not Authorized to access createArtwork on type Mutation"
    }
  ],
  "data": {
    "createArtwork": null
  }
}
```

## TEST2 admin createArtwork

**期望**：成功

```json
{
  "errors": [],
  "data": {
    "createArtwork": {
      "id": "a643835d-1f03-45a9-bd08-854f4af045b3",
      "title": "Admin Piece 2",
      "owner": null,
      "status": "在售"
    }
  }
}
```

## TEST3 maker updateArtwork（他人作品）

**期望**：拒绝

```json
{
  "errors": [
    {
      "errorType": "Unauthorized",
      "message": "Not Authorized to access updateArtwork on type Mutation"
    }
  ],
  "data": {
    "updateArtwork": null
  }
}
```

## TEST4 maker createArtwork + 显式 owner → 再 update

**期望**：create / update 均成功

```json
{
  "data": {
    "createArtwork": {
      "id": "4f4587b2-2a26-4f35-91ab-56676d6f168c",
      "title": "Owned",
      "owner": "54d8d448-0011-709f-2c04-e0bb2803046e"
    }
  }
}
```

```json
{
  "data": {
    "updateArtwork": {
      "id": "4f4587b2-2a26-4f35-91ab-56676d6f168c",
      "title": "Owned-upd",
      "owner": "54d8d448-0011-709f-2c04-e0bb2803046e"
    }
  }
}
```

## TEST5 collector updateArtwork（maker 的作品）

**期望**：拒绝

```json
{
  "errors": [
    {
      "errorType": "Unauthorized",
      "message": "Not Authorized to access updateArtwork on type Mutation"
    }
  ],
  "data": {
    "updateArtwork": null
  }
}
```

## TEST6 collector listArtworks

**期望**：可读

```json
{
  "errors": [],
  "data": {
    "listArtworks": {
      "items": [
        { "id": "a643835d-1f03-45a9-bd08-854f4af045b3", "title": "Admin Piece 2", "status": "在售" },
        { "id": "4f4587b2-2a26-4f35-91ab-56676d6f168c", "title": "Owned-upd", "status": "草稿" }
      ]
    }
  }
}
```

（完整 list 含更早 sandbox 脏数据，略。）

## TEST7 collector createPayout

**期望**：拒绝

```json
{
  "errors": [
    {
      "errorType": "Unauthorized",
      "message": "Not Authorized to access createPayout on type Mutation"
    }
  ],
  "data": {
    "createPayout": null
  }
}
```

## TEST8 admin createPayout

**期望**：成功

```json
{
  "errors": [],
  "data": {
    "createPayout": {
      "id": "a5dc948e-4f33-4b7f-9065-ae11163ee7a3",
      "status": "待打款",
      "netUSD": 8500
    }
  }
}
```
