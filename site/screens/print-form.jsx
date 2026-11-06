/* St. John the Beloved test site · Membership form (site/screens/print-form.jsx, #/print/membership-form): the paper form a
   family fills in at the church door, laid out as an A4 sheet. A PrintDocument (the sheet, with a letterhead and a footer),
   AnswerLines for the handwritten answers and a PageBreak (drawn as a dashed line, preview) before the second sheet. A Print
   button opens the browser's print dialog. Plenix parts: PrintDocument, AnswerLines, PageBreak, PageContent, Stack, Inline,
   Heading, Text, Button. */
import { AnswerLines, Button, Heading, Inline, PageBreak, PageContent, PrintDocument, Stack, Text } from 'plenix-platform';
import { CHURCH } from '../data.js';
import { SitePage } from '../site.jsx';

export function PrintFormScreen({ chrome }) {
  return (
    <SitePage chrome={chrome} page="members">
      <PageContent>
        <Stack gap="md">
          <Inline gap="md" justify="between">
            <Heading level={1}>Membership form</Heading>
            <Button variant="primary" onClick={() => window.print()}>Print</Button>
          </Inline>
          <PrintDocument header={<Text as="p" variant="strong">{CHURCH.name}</Text>} footer={<Text as="p" variant="secondary">Return this form to the church office. It is kept private.</Text>} lang="en">
            <Stack gap="md">
              <Heading level={2}>New family</Heading>
              <Text as="p">Please print clearly. Tell us who is in your household and how we can reach you.</Text>
              <AnswerLines label="Names of everyone in the household" lines={4} />
              <AnswerLines label="Address" lines={3} />
              <AnswerLines label="Phone and email" lines={2} />
            </Stack>
            <PageBreak preview />
            <Stack gap="md">
              <Heading level={2}>Serving</Heading>
              <Text as="p">Tell us where you would like to serve: Sunday School, the Agape Kitchen, ushers, readers or the sound desk.</Text>
              <AnswerLines label="Where I would like to serve" lines={5} />
              <AnswerLines label="Notes for the church office" />
            </Stack>
          </PrintDocument>
        </Stack>
      </PageContent>
    </SitePage>
  );
}
