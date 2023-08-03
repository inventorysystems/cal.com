const sendGimpedPayload = async (
  triggerEvent: string,
  createdAt: string,
  data: any
) => {
  const body = JSON.stringify({
    triggerEvent: triggerEvent,
    createdAt: createdAt,
    payload: data,
  });

  return _sendPayload(body);
};

const SUBSCRIBER_URL = 'https://calcom-webhooks.porter.oneshop.com/api/webhook';

const _sendPayload = async (
  body: string,
) => {
  // TODO: Create secret signature
  const secretSignature = "no-secret-provided";

  const response = await fetch(SUBSCRIBER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

export default sendGimpedPayload;
