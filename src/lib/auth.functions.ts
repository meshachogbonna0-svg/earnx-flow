import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const identifierSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
});

/**
 * Resolves a username to the account's email address so people can sign in with
 * either. Runs server-side only — the underlying lookup is not exposed to the browser.
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => identifierSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.identifier.includes("@")) {
      return { email: data.identifier.toLowerCase() };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: email, error } = await supabaseAdmin.rpc("email_for_username", {
      _username: data.identifier,
    });

    if (error || !email) {
      return { email: null as string | null };
    }

    return { email: email as string };
  });
