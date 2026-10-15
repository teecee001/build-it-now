let n = 0;
/** supabase-js returns the existing channel for a repeated topic; screens stay mounted in
 *  native tab/stack navigators, so every hook instance needs its own topic. */
export const uniqueChannel = (name: string) => `${name}-${++n}`;
