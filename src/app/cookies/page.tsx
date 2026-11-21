import { InfoPage, infoMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoMetadata("cookies");

export default function Page() {
  return <InfoPage id="cookies" />;
}
