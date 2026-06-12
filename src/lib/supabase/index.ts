export { createBrowserSupabaseClient } from "./client";
export {
  createServerSupabaseClient,
  createAuthedSupabaseClient,
} from "./server";

import { createServerSupabaseClient } from "./server";

export const supabase = createServerSupabaseClient();
