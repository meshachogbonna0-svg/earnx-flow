import { supabase } from "@/integrations/supabase/client";

type RpcResult<T> = { data: T; error: { message: string } | null };

/**
 * Typed-loose RPC helper. The generated Supabase types lag behind newly created
 * database functions, so every call goes through one bound, cast entry point.
 */
export async function rpc<T = Record<string, unknown>>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<RpcResult<T>> {
  const call = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await call(fn, args);
  return { data: (data ?? {}) as T, error };
}

/** Loose table accessor for tables missing from the generated types. */
export const table = (name: string) => supabase.from(name as never);
