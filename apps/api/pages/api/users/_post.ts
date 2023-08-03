import type { NextApiRequest } from "next";

import { handleGimpedWebhookTrigger } from "@calcom/features/webhooks/lib/handleGimpedWebhookTrigger";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { schemaUserCreateBodyParams } from "~/lib/validations/user";

/**
 * @swagger
 * /users:
 *   post:
 *     operationId: addUser
 *     summary: Creates a new user
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     requestBody:
 *       description: Create a new user
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *              - email
 *              - username
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email that belongs to the user being edited
 *               username:
 *                 type: string
 *                 description: Username for the user being created
 *               brandColor:
 *                 description: The new user's brand color
 *                 type: string
 *               darkBrandColor:
 *                 description: The new user's brand color for dark mode
 *                 type: string
 *               weekStart:
 *                 description: Start of the week. Acceptable values are one of [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY]
 *                 type: string
 *               timeZone:
 *                 description: The new user's time zone. Eg- 'EUROPE/PARIS'
 *                 type: string
 *               theme:
 *                 description: Default theme for the new user. Acceptable values are one of [DARK, LIGHT]
 *                 type: string
 *               timeFormat:
 *                 description: The new user's time format. Acceptable values are one of [TWELVE, TWENTY_FOUR]
 *                 type: string
 *               locale:
 *                 description: The new user's locale. Acceptable values are one of [EN, FR, IT, RU, ES, DE, PT, RO, NL, PT_BR, ES_419, KO, JA, PL, AR, IW, ZH_CH, ZH_TW, CS, SR, SV, VI]
 *                 type: string
 *           examples:
 *              user:
 *                summary: An example of USER
 *                value:
 *                  email: 'email@example.com'
 *                  username: 'johndoe'
 *                  weekStart: 'MONDAY'
 *                  brandColor: '#555555'
 *                  darkBrandColor: '#111111'
 *                  timeZone: 'EUROPE/PARIS'
 *                  theme: 'LIGHT'
 *                  timeFormat: 'TWELVE'
 *                  locale: 'FR'
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user created
 *       400:
 *        description: Bad request. user body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { prisma, isAdmin } = req;
  // If user is not ADMIN, return unauthorized.
  if (!isAdmin) throw new HttpError({ statusCode: 401, message: "You are not authorized" });
  const data = await schemaUserCreateBodyParams.parseAsync(req.body);
  const user = await prisma.user.create({ data });

  const webhookData = {
    id: user.id,
    businessId: req.body.business_id ?? "",
    username: user.username,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    bio: user.bio,
    avatar: user.avatar,
    timeZone: user.timeZone,
    weekStart: user.weekStart,
    endTime: user.endTime,
    bufferTime: user.bufferTime,
    defaultScheduleId: user.defaultScheduleId,
    locale: user.locale,
    timeFormat: user.timeFormat,
    allowDynamicBooking: user.allowDynamicBooking,
    away: user.away,
    verified: user.verified,
    role: user.role,
    created_at: user.createdDate,
  };
  await handleGimpedWebhookTrigger({
    eventTrigger: WebhookTriggerEvents.BOOKING_PAID,
    webhookData,
  });

  req.statusCode = 201;
  return { user };
}

export default defaultResponder(postHandler);
