import { InfoPage, infoMetadata } from "@/components/info/InfoPage";

export const metadata = infoMetadata("refunds");

export default function Page() {
  return <InfoPage id="refunds" />;
}
