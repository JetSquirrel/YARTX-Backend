import { defineAuth } from "@aws-amplify/backend";

/**
 * Cognito User Pool：买家 collector / 艺术家 maker / 运营 admin 三组。
 * MFA 用 TOTP（可选）；不要开短信（SNS 另计费，海外贵）。
 * 社交登录（Google / Apple）留到 T9，需所有者提供客户端。
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ["collector", "maker", "admin"],
  multifactor: {
    mode: "OPTIONAL",
    totp: true,
  },
});
