import { InfoPage, infoMetadata } from "@/components/info/InfoPage";

export const metadata = infoMetadata("terms");

export default function Page() {
  return <InfoPage id="terms" />;
}
