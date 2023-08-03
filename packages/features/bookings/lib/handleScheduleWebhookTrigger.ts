import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import type { WebhookDataType } from "@calcom/features/webhooks/lib/sendPayload";
import type { ScheduleWebhookDataType } from "@calcom/features/webhooks/lib/sendSchedulePayload";
import sendSchedulePayload from "@calcom/features/webhooks/lib/sendSchedulePayload";
import logger from "@calcom/lib/logger";

export async function handleScheduleWebhookTrigger(args: {
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: string;
  webhookData: ScheduleWebhookDataType;
}) {
  try {
    const subscribers = await getWebhooks(args.subscriberOptions);

    const promises = subscribers.map((sub) =>
      sendSchedulePayload(
        sub.secret,
        args.eventTrigger,
        new Date().toISOString(),
        sub,
        args.webhookData
      ).catch((e) => {
        console.error(
          `Error executing webhook for event: ${args.eventTrigger}, URL: ${sub.subscriberUrl}`,
          e
        );
      })
    );
    await Promise.all(promises);
  } catch (error) {
    logger.error("Error while sending webhook", error);
  }
}
