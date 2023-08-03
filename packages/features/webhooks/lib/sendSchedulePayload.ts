import type { Webhook } from "@prisma/client";
import { createHmac } from "crypto";
import { compile } from "handlebars";

type ContentType = "application/json" | "application/x-www-form-urlencoded";

export type ScheduleWebhookDataType = {
  id: null | number;
  user: null;
  userId: null | number;
  eventType: null;
  name: null | string;
  timeZone: null | string;
  availability: null;
};

function applyScheduleTemplate(template: string, data: ScheduleWebhookDataType, contentType: ContentType) {
  const formattedData = { ...data };

  const compiled = compile(template)(formattedData).replace(/&quot;/g, '"');

  if (contentType === "application/json") {
    return JSON.stringify(jsonParse(compiled));
  }
  return compiled;
}

function jsonParse(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // don't do anything.
  }
  return false;
}

const sendSchedulePayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  data: ScheduleWebhookDataType
) => {
  const { appId, payloadTemplate: template } = webhook;

  const contentType =
    !template || jsonParse(template) ? "application/json" : "application/x-www-form-urlencoded";

  let body;

  if (template) {
    body = applyScheduleTemplate(template, { ...data }, contentType);
  } else {
    body = JSON.stringify({
      triggerEvent: triggerEvent,
      createdAt: createdAt,
      payload: data,
    });
  }

  return _sendPayload(secretKey, triggerEvent, createdAt, webhook, body, contentType);
};

export const sendGenericWebhookPayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  data: Record<string, unknown>
) => {
  const body = JSON.stringify(data);
  return _sendPayload(secretKey, triggerEvent, createdAt, webhook, body, "application/json");
};

const _sendPayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  body: string,
  contentType: "application/json" | "application/x-www-form-urlencoded"
) => {
  const { subscriberUrl } = webhook;
  if (!subscriberUrl || !body) {
    throw new Error("Missing required elements to send webhook payload.");
  }

  const secretSignature = secretKey
    ? createHmac("sha256", secretKey).update(`${body}`).digest("hex")
    : "no-secret-provided";

  const response = await fetch(subscriberUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Cal-Signature-256": secretSignature,
    },
    body,
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    message: text,
  };
};

export default sendSchedulePayload;
