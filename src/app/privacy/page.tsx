import { InfoPage, infoMetadata } from "@/components/info/InfoPage";

export const metadata = infoMetadata("privacy");

export default function Page() {
  return <InfoPage id="privacy" />;
}
