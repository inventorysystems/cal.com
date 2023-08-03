import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { handleScheduleWebhookTrigger } from "@calcom/features/bookings/lib/handleScheduleWebhookTrigger";
import type { ScheduleWebhookDataType } from "@calcom/features/webhooks/lib/sendSchedulePayload";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { defaultResponder } from "@calcom/lib/server";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { schemaCreateScheduleBodyParams, schemaSchedulePublic } from "~/lib/validations/schedule";

/**
 * @swagger
 * /schedules:
 *   post:
 *     operationId: addSchedule
 *     summary: Creates a new schedule
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *     requestBody:
 *       description: Create a new schedule
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - timeZone
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the schedule
 *               timeZone:
 *                 type: string
 *                 description: The timeZone for this schedule
 *           examples:
 *             schedule:
 *               value:
 *                 {
 *                   "name": "Sample Schedule",
 *                   "timeZone": "Asia/Calcutta"
 *                 }
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK, schedule created
 *         content:
 *           application/json:
 *             examples:
 *               schedule:
 *                 value:
 *                   {
 *                     "schedule": {
 *                       "id": 79471,
 *                       "userId": 182,
 *                       "name": "Total Testing",
 *                       "timeZone": "Asia/Calcutta",
 *                       "availability": [
 *                         {
 *                           "id": 337917,
 *                           "eventTypeId": null,
 *                           "days": [1, 2, 3, 4, 5],
 *                           "startTime": "09:00:00",
 *                           "endTime": "17:00:00"
 *                         }
 *                       ]
 *                     },
 *                     "message": "Schedule created successfully"
 *                   }
 *       400:
 *        description: Bad request. Schedule body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */

async function postHandler(req: NextApiRequest) {
  const { userId, prisma } = req;
  const body = schemaCreateScheduleBodyParams.parse(req.body);
  let args: Prisma.ScheduleCreateArgs = { data: { ...body, userId } };

  /* If ADMIN we create the schedule for selected user */
  // if (isAdmin && body.userId) args = { data: { ...body, userId: body.userId } };
  if (body.userId != null) {
    args = { data: { ...body, userId: body.userId } };
  }

  // if (!isAdmin && body.userId)
  //   throw new HttpError({ statusCode: 403, message: "ADMIN required for `userId`" });

  // We create default availabilities for the schedule
  args.data.availability = {
    createMany: {
      data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE).map((schedule) => ({
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    },
  };
  // We include the recently created availability
  args.include = { availability: true };

  const data = await prisma.schedule.create(args);

  await prisma.user.update({
    where: {
      id: data.userId,
    },
    data: {
      defaultScheduleId: data.id,
    },
  });

  const subscriberOptions = {
    userId: data.userId,
    triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
  };
  const eventTrigger: WebhookTriggerEvents = WebhookTriggerEvents.BOOKING_PAID;
  const webhookData: ScheduleWebhookDataType = {
    id: null,
    user: null,
    userId: data.userId,
    eventType: null,
    name: data.name,
    timeZone: data.timeZone,
    availability: null,
  };
  await handleScheduleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData });

  return {
    schedule: schemaSchedulePublic.parse(data),
    message: "Schedule created successfully",
  };
}

export default defaultResponder(postHandler);
