import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * YARTX Amplify Data schema（POC）。
 *
 * 约定（见 docs/ARCHITECTURE.md · CLAUDE.md）：
 * - 金额字段一律 USD cent 整数（priceUSD / amountUSD / grossUSD …）
 * - 状态值存中文原文（申请/通过/停用、草稿/待审/在售/售出、待付/已付/…），不做枚举强约束
 * - 结账库存与价格由 shop-api 强一致读 DynamoDB（T5），不经本 GraphQL 写库存扣减
 *
 * 授权（组权限）：
 * - 访客 / collector：可读作品与已通过艺术家（「只读在售」靠 status 筛选 + 应用层；鉴权层放行 read）
 * - maker：只能写自己的 Artist / Artwork（owner）
 * - admin：全权
 */
const schema = a.schema({
  Artist: a
    .model({
      handle: a.string().required(),
      displayName: a.string().required(),
      city: a.string(),
      fansCount: a.integer(),
      igUrl: a.string(),
      /** 申请 / 通过 / 停用 */
      status: a.string().required(),
      payoutAccount: a.string(),
      avatarUrl: a.string(),
      owner: a.string(),
      artworks: a.hasMany("Artwork", "artistId"),
      payouts: a.hasMany("Payout", "artistId"),
    })
    .secondaryIndexes((index) => [index("handle"), index("status")])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      // 仅 maker 可建档；改删限本人（owner）。owner.create 会让任意登录用户建出自己的记录，故拆开。
      allow.group("maker").to(["create"]),
      allow.owner().to(["update", "delete"]),
      allow.group("admin"),
    ]),

  Artwork: a
    .model({
      title: a.string().required(),
      titleCn: a.string(),
      artistId: a.id().required(),
      artist: a.belongsTo("Artist", "artistId"),
      /** original | edition | nft | object */
      type: a.string().required(),
      styleTags: a.string().array(),
      /** USD cent */
      priceUSD: a.integer().required(),
      priceDisplay: a.string(),
      editionNo: a.integer(),
      editionOf: a.integer(),
      stock: a.integer(),
      images: a.string().array(),
      /** 草稿 / 待审 / 在售 / 售出 */
      status: a.string().required(),
      statement: a.string(),
      story: a.string(),
      shipsFrom: a.string(),
      /** create 走 group(maker) 时不会自动填 owner，客户端须写入 cognito sub */
      owner: a.string(),
    })
    .secondaryIndexes((index) => [
      index("status"),
      index("artistId"),
      index("type"),
    ])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("maker").to(["create"]),
      allow.owner().to(["update", "delete"]),
      allow.group("admin"),
    ]),

  Customer: a
    .model({
      cognitoSub: a.string().required(),
      email: a.email().required(),
      country: a.string(),
      firstSeenAt: a.datetime(),
      /** USD cent */
      lifetimeValue: a.integer(),
      owner: a.string(),
      orders: a.hasMany("Order", "buyerId"),
    })
    .secondaryIndexes((index) => [index("cognitoSub"), index("email")])
    .authorization((allow) => [
      // collector 可建自己的客户档案；admin 全权。shop-api（T5）后续用 allow.resource。
      allow.group("collector").to(["create"]),
      allow.owner().to(["read", "update"]),
      allow.group("admin"),
    ]),

  Order: a
    .model({
      buyerId: a.id(),
      buyer: a.belongsTo("Customer", "buyerId"),
      /** JSON：[{ artworkId, qty, unitPriceUSD }]，金额为 cent */
      items: a.json().required(),
      /** USD cent */
      amountUSD: a.integer().required(),
      /** stripe | paypal | alipay */
      channel: a.string().required(),
      paymentIntentId: a.string(),
      /** 待付 / 已付 / 备货 / 已发 / 完成 / 退款 */
      status: a.string().required(),
      shipping: a.json(),
      trackingNo: a.string(),
      /** Cognito sub，买家 owner 规则用 */
      owner: a.string(),
    })
    .secondaryIndexes((index) => [
      index("paymentIntentId"),
      index("status"),
      index("buyerId"),
    ])
    .authorization((allow) => [
      // 结账主路径是 shop-api（IAM）；买家只读自己的单。POC 暂不开放 GraphQL 建单给 collector。
      allow.owner().to(["read"]),
      allow.group("admin"),
    ]),

  VisitEvent: a
    .model({
      country: a.string().required(),
      path: a.string(),
      referrer: a.string(),
      ts: a.datetime().required(),
    })
    .secondaryIndexes((index) => [index("country"), index("ts")])
    .authorization((allow) => [
      allow.guest().to(["create"]),
      allow.group("admin").to(["read"]),
    ]),

  Payout: a
    .model({
      artistId: a.id().required(),
      artist: a.belongsTo("Artist", "artistId"),
      period: a.string().required(),
      /** USD cent */
      grossUSD: a.integer().required(),
      feeUSD: a.integer().required(),
      netUSD: a.integer().required(),
      /** 待打款 / 已打款 */
      status: a.string().required(),
      worldfirstRef: a.string(),
      owner: a.string(),
    })
    .secondaryIndexes((index) => [index("artistId"), index("status")])
    .authorization((allow) => [
      allow.owner().to(["read"]),
      allow.group("admin"),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // 登录用户走 User Pool（组权限 / owner）；allow.guest() 会自动启用 Identity Pool
    defaultAuthorizationMode: "userPool",
  },
});
