import type { AppRouteHandler } from "@/types/lib";

import { createRouter } from "@/lib/create-app";

import * as handlers from "./handlers";
import * as routes from "./routes";

export const gpt = createRouter()
  .openapi(routes.getGptChat, handlers.getGptChat);

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type GptRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
