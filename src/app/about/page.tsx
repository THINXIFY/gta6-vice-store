import { InfoPage, infoMetadata } from "@/components/info/InfoPage";

export const generateMetadata = () => infoMetadata("about");

export default function Page() {
  return <InfoPage id="about" />;
}
