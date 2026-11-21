import { ContactForm } from "@/components/info/ContactForm";
import { InfoPage, infoMetadata } from "@/components/info/InfoPage";
import { Container } from "@/components/ui/Layout";
import { getPublished } from "@/server/content";

export const generateMetadata = () => infoMetadata("contact");

export default async function ContactPage() {
  const published = await getPublished();
  return (
    <InfoPage id="contact">
      <Container className="pb-14">
        <section aria-label="Send us a message" className="max-w-3xl">
          <ContactForm preview={!published.contact} />
        </section>
      </Container>
    </InfoPage>
  );
}
