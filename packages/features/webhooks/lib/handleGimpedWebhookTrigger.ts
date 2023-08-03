import sendSchedulePayload from "@calcom/features/webhooks/lib/sendGimpedPayload";
import logger from "@calcom/lib/logger";

export async function handleGimpedWebhookTrigger(args: { eventTrigger: string; webhookData: object }) {
  try {
    await sendSchedulePayload(args.eventTrigger, new Date().toISOString(), args.webhookData).catch((e) => {
      console.error(`Error executing webhook for event: ${args.eventTrigger}`, e);
    });
  } catch (error) {
    logger.error("Error while sending webhook", error);
  }
}
