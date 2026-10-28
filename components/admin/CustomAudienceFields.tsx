import { customAudiences } from "@/lib/custom-audiences";

export default function CustomAudienceFields({ selected=[] }: { selected?: string[] }) {
  return <fieldset className="rounded-lg border border-gray-200 p-4">
    <legend className="px-1 font-medium">Custom apparel categories</legend>
    <p className="mb-4 text-sm text-gray-600">Choose every group this product should appear in. Multiple selections are allowed. Leave all unchecked to show it only in All custom apparel.</p>
    <div className="grid gap-3 sm:grid-cols-2">{Object.entries(customAudiences).map(([value,label]) =>
      <label key={value} className="flex items-center gap-3 text-sm"><input type="checkbox" name="custom_audiences" value={value} defaultChecked={selected.includes(value)} />{label}</label>)}</div>
  </fieldset>;
}
