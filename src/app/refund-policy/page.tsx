import { InfoPage, infoMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoMetadata("refunds");

export default function Page() {
  return <InfoPage id="refunds" />;
}
