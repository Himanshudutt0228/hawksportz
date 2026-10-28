export const customAudiences = {
  business: "Businesses", schools: "Schools", teams: "Sports teams",
  clubs: "Clubs & groups", hospitality: "Restaurants & hospitality", events: "Events",
} as const;
export type CustomAudience = keyof typeof customAudiences;
export function isCustomAudience(value: unknown): value is CustomAudience {
  return typeof value === "string" && Object.hasOwn(customAudiences,value);
}
export function readCustomAudiences(form: FormData): CustomAudience[] | null {
  const values = form.getAll("custom_audiences");
  if (values.length>6 || !values.every(isCustomAudience)) return null;
  return [...new Set(values)] as CustomAudience[];
}
