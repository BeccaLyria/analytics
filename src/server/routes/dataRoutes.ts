import { FastifyInstance, FastifyRequest } from "fastify";

import { Client } from "../../interfaces/Client";
import { errorHandler } from "../../utils/errorHandler";
import {
  isEventType,
  isValidCommand,
  isValidCommandWithGroups,
  isValidCommandWithNothing,
  isValidCommandWithSubcommands,
  isValidSubcommand,
  isValidSubcommandGroup,
  isValidSubcommandInGroup,
} from "../../utils/typeGuards";
import { CommandSchema } from "../schemas/CommandSchema";
import { ErrorSchema } from "../schemas/ErrorSchema";
import { EventSchema } from "../schemas/EventSchema";
import { GuildSchema } from "../schemas/GuildSchema";
import { MemberSchema } from "../schemas/MemberSchema";

/**
 * Handles updating the number of guilds.
 *
 * @param {FastifyInstance} app The Fastify app.
 * @param {object} param1 Options object.
 * @param {Client} param1.client The client.
 */
export const guildRoute = async (
  app: FastifyInstance,
  { client }: { client: Client }
) => {
  try {
    app.post(
      "/guilds",
      { schema: GuildSchema },
      (req: FastifyRequest<{ Body: { count: number } }>, res) => {
        if (req.headers.authorization !== process.env.ENDPOINT_AUTH) {
          res.status(401).send({
            message: "Unauthorized.",
          });
          return;
        }
        const { count } = req.body;

        if (!count) {
          res.status(400).send({
            message: "No count provided.",
          });
          return;
        }

        client.cache.updateCurrentGuild(count);

        res.send({
          message: `Current guild count is ${client.cache.latest.guild?.count}`,
        });
      }
    );
  } catch (err) {
    await errorHandler("guild route", err);
  }
};

/**
 * Handles updating the number of members.
 *
 * @param {FastifyInstance} app The Fastify app.
 * @param {object} param1 Options object.
 * @param {Client} param1.client The client.
 */
export const memberRoute = async (
  app: FastifyInstance,
  { client }: { client: Client }
) => {
  try {
    app.post(
      "/members",
      { schema: MemberSchema },
      (req: FastifyRequest<{ Body: { count: number } }>, res) => {
        if (req.headers.authorization !== process.env.ENDPOINT_AUTH) {
          res.status(401).send({
            message: "Unauthorized.",
          });
          return;
        }
        const { count } = req.body;

        if (!count) {
          res.status(400).send({
            message: "No count provided.",
          });
          return;
        }

        client.cache.updateCurrentGuild(count);

        res.send({
          message: `Current member count is ${client.cache.latest.member?.count}`,
        });
      }
    );
  } catch (err) {
    await errorHandler("member route", err);
  }
};

/**
 * Handles updating the number of errors.
 *
 * @param {FastifyInstance} app The Fastify app.
 * @param {object} param1 Options object.
 * @param {Client} param1.client The client.
 */
export const errorRoute = async (
  app: FastifyInstance,
  { client }: { client: Client }
) => {
  try {
    app.post(
      "/errors",
      { schema: ErrorSchema },
      (req: FastifyRequest<{ Body: { handled: boolean } }>, res) => {
        if (req.headers.authorization !== process.env.ENDPOINT_AUTH) {
          res.status(401).send({
            message: "Unauthorized.",
          });
          return;
        }
        const { handled } = req.body;

        if (!("handled" in req.body)) {
          res.status(400).send({
            message: "Was this error handled or not?",
          });
          return;
        }

        client.cache.updateCurrentError(handled);

        res.send({
          message: `Current error count is ${client.cache.latest.error?.handled} handled and ${client.cache.latest.error?.unhandled} unhandled`,
        });
      }
    );
  } catch (err) {
    await errorHandler("error route", err);
  }
};

/**
 * Handles updating the number of events.
 *
 * @param {FastifyInstance} app The Fastify app.
 * @param {object} param1 Options object.
 * @param {Client} param1.client The client.
 */
export const eventRoute = async (
  app: FastifyInstance,
  { client }: { client: Client }
) => {
  try {
    app.post(
      "/events",
      { schema: EventSchema },
      (req: FastifyRequest<{ Body: { event: string } }>, res) => {
        if (req.headers.authorization !== process.env.ENDPOINT_AUTH) {
          res.status(401).send({
            message: "Unauthorized.",
          });
          return;
        }
        const { event } = req.body;

        if (!event) {
          res.status(400).send({
            message: "No event name provided.",
          });
          return;
        }

        if (!isEventType(event)) {
          res.status(400).send({
            message: `${event} is not a valid event type.`,
          });
          return;
        }

        client.cache.updateCurrentEvent(event);

        res.send({
          message: `Current event count is ${client.cache.latest.event?.[event]} for ${event}`,
        });
      }
    );
  } catch (err) {
    await errorHandler("event route", err);
  }
};

/**
 * Handles updating the number of command uses.
 *
 * @param {FastifyInstance} app The Fastify app.
 * @param {object} param1 Options object.
 * @param {Client} param1.client The client.
 */
export const commandRoute = async (
  app: FastifyInstance,
  { client }: { client: Client }
) => {
  try {
    app.post(
      "/commands",
      {
        schema: CommandSchema,
      },
      (
        req: FastifyRequest<{
          Body: {
            command: string;
            subcommand?: string;
            subcommandGroup?: string;
          };
        }>,
        res
      ) => {
        if (req.headers.authorization !== process.env.ENDPOINT_AUTH) {
          res.status(401).send({
            message: "Unauthorized.",
          });
          return;
        }
        const { command, subcommand, subcommandGroup } = req.body;

        if (!command) {
          res.status(400).send({
            message: "No command name provided.",
          });
          return;
        }

        if (!isValidCommand(command)) {
          res.status(400).send({
            message: `${command} is not a valid command.`,
          });
          return;
        }

        // command must exist and be valid, others can be undefined

        // but then command must be a valid command with no subcommands
        if (isValidCommandWithNothing(command)) {
          const success = client.cache.updateCurrentCommand(command);
          if (!success) {
            res.status(400).send({
              message: `Failed to update the data for ${command}. Double check that it is valid?`,
            });
            return;
          }
          res.send({
            message: `Current command count is ${client.cache.latest.command?.[command]} for ${command}`,
          });
          return;
        }

        // otherwise, subcommand must be present
        if (!subcommand) {
          res.status(400).send({
            message: `${command} requires a subcommand.`,
          });
          return;
        }

        // if subcommandGroup is present, then command must be a valid command with subcommand groups

        if (subcommandGroup) {
          if (!isValidCommandWithGroups(command)) {
            res.status(400).send({
              message: `${command} does not have subcommand groups. Does it have direct subcommands?`,
            });
            return;
          }
          if (!isValidSubcommandGroup(subcommandGroup)) {
            res.status(400).send({
              message: `${subcommandGroup} is not a valid subcommand group for ${command}.`,
            });
            return;
          }

          if (!isValidSubcommandInGroup(subcommand, subcommandGroup, command)) {
            res.status(400).send({
              message: `${subcommand} is not a valid subcommand for ${command}.${subcommandGroup}.`,
            });
            return;
          }

          const success = client.cache.updateCurrentCommand(
            command,
            subcommandGroup,
            subcommand
          );
          if (!success) {
            res.status(400).send({
              message: `Failed to update the data for ${command}.${subcommandGroup}.${subcommand}. Double check that it is valid?`,
            });
            return;
          }
          res.send({
            message: `Current command count is ${client.cache.latest.command?.[command]?.[subcommandGroup]?.[subcommand]} for ${command}.${subcommandGroup}.${subcommand}`,
          });
        }

        // now subcommandGroup doesn't exist, must be valid command with subcommands.

        if (!isValidCommandWithSubcommands(command)) {
          res.status(400).send({
            message: `${command} does not have direct subcommands. Does it have subcommand groups?`,
          });
          return;
        }

        if (!isValidSubcommand(subcommand, command)) {
          res.status(400).send({
            message: `${subcommand} is not a valid subcommand for ${command}.`,
          });
          return;
        }

        const success = client.cache.updateCurrentCommand(command, subcommand);
        if (!success) {
          res.status(400).send({
            message: `Failed to update the data for ${command}.${subcommand}. Double check that it is valid?`,
          });
          return;
        }

        res.send({
          message: `Current command count is ${client.cache.latest.command?.[command]?.[subcommand]} for ${command}.${subcommand}`,
        });
      }
    );
  } catch (err) {
    await errorHandler("command route", err);
  }
};
