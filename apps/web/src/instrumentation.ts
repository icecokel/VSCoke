import type { Instrumentation } from "next";
import { reportException } from "@/lib/error-reporting";

export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  await reportException("server", error, context.routePath, "web-server");
};
