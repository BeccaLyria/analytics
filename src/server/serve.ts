import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";

import { Client } from "../interfaces/Client";
import { errorHandler } from "../utils/errorHandler";
import { generateServerConfig } from "../utils/generateServerConfig";

import { dataRoute, latestRoute } from "./routes/consumeRoutes";
import {
  commandRoute,
  errorRoute,
  eventRoute,
  guildRoute,
  memberRoute,
} from "./routes/dataRoutes";

/**
 * Instantiates the Fastify web server.
 *
 * @param {Client} client The client.
 */
export const serve = async (client: Client) => {
  try {
    const config = await generateServerConfig();
    const app = Fastify(config);

    if (process.env.NODE_ENV === "development") {
      app.register(fastifySwagger, {
        swagger: {
          info: {
            title: "Analytics API",
            version: "0.0.0",
          },
          host: "localhost:2000",
          schemes: ["http"],
          consumes: ["application/json"],
          produces: ["application/json"],
          tags: [{ name: "data", description: "Data related end-points" }],
        },
      });
      app.register(fastifySwaggerUi);
      app.log.info(
        `Swagger docs available at http://localhost:2000/documentation`
      );
    }

    // mount your middleware and routes here
    app.register(guildRoute, { client });
    app.register(memberRoute, { client });
    app.register(eventRoute, { client });
    app.register(commandRoute, { client });
    app.register(errorRoute, { client });
    app.register(dataRoute, { client });
    app.register(latestRoute, { client });

    await app.ready();
    app.listen({ port: 2000 });
  } catch (err) {
    await errorHandler("serve", err);
  }
};
