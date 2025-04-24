import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Preview,
  render,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { APP_URL } from "../config/config";

interface OAKEmailProps {
  heading: string;
  copy: string;
  link: {
    label: string;
    url: string;
  };
}

const baseUrl = APP_URL();

export const OAKEmail = ({ heading, copy, link }: OAKEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>{copy}</Preview>
      <Container style={container}>
        <Row style={logoRow}>
          <Column style={logoContainer}>
            <Img
              src={`${baseUrl}/icons/logo.png`}
              width="40"
              height="40"
              alt="OAK"
              style={logo}
            />
          </Column>
          <Column>
            <Text style={logoText}>Open Agent Kit</Text>
          </Column>
        </Row>
        <Text style={headline}>{heading}</Text>
        <Text style={copyParagraph}>{copy}</Text>
        <Section style={btnContainer}>
          <Button style={button} href={link.url}>
            {link.label}
          </Button>
        </Section>
      </Container>
    </Body>
  </Html>
);

OAKEmail.PreviewProps = {
  heading: "Welcome to OAK",
  copy: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  link: {
    label: "Get started",
    url: "https://open-agent-kit.com",
  },
} as OAKEmailProps;

export default OAKEmail;

export const renderedOAKEmail = async (
  heading: string,
  copy: string,
  link: { label: string; url: string },
) => {
  const html = await render(
    <OAKEmail heading={heading} copy={copy} link={link} />,
  );
  return html;
};

const logoContainer = {
  width: "40px",
};

const logoRow = {
  marginBottom: "30px",
};

const logoText = {
  fontSize: "16px",
  lineHeight: "26px",
  marginLeft: "10px",
  fontWeight: "bold",
};

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const logo = {};

const headline = {
  fontSize: "18px",
  lineHeight: "26px",
  marginBottom: "15px",
  fontWeight: "bold",
};
const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};

const copyParagraph = {
  fontSize: "16px",
  lineHeight: "26px",
  marginTop: "0px",
  marginBottom: "30px",
};

const btnContainer = {
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#262626",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
  width: "200px",
  margin: "0 auto",
  marginBottom: "15px",
};

const hr = {
  borderColor: "#cccccc",
  margin: "20px 0",
};
