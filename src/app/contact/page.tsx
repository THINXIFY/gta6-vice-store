import { ContactForm } from "@/components/info/ContactForm";
import { InfoPage, infoMetadata } from "@/components/info/InfoPage";
import { Container } from "@/components/ui/Layout";
import { site } from "@/config/site";

export const metadata = infoMetadata("contact");

export default function ContactPage() {
  return (
    <InfoPage id="contact">
      <Container className="pb-14">
        <section aria-label="Send us a message" className="max-w-3xl">
          <ContactForm preview={!site.pages.contact.published} />
        </section>
      </Container>
    </InfoPage>
  );
}
