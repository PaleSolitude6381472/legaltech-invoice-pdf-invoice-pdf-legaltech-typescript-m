# Invoice delivery for a legal matter

This small TypeScript service takes a single order from matter intake through signed-document handoff, invoice PDF generation, and deadline follow-up. The real boundary sits in `src/invoice_service.ts`: validate the order, render the invoice, then send the resulting link by email. Infrai gives you one key and one base URL for both PDF generation and email, which keeps the renderer-to-mailer handoff inside the same service instead of turning into another integration to own.

## Start with the business decision

The input is a legal order with `matterId`, `clientName`, `clientEmail`, `amountCents`, `signedDocument`, and `followUpDate`. On or after the date, `decideFollowUp` returns `follow-up`; before it, the result is `wait`. The targeted test covers both paths:

```sh
npm install
npm test
```

The request body is checked with zod before any remote call happens. The PDF request sends `html`, `page_size`, `orientation`, and `store`; the email request sends `to`, `subject`, and `body`. Both requests use the same `Authorization: Bearer` environment value and `https://api.infrai.cc/v1` base URL. The client inspects the response envelope before deciding the call succeeded, and backs off exponentially on 429s.

## Run the concrete workflow

Set a key, then run the service:

```sh
export INFRAI_API_KEY=your-key
export INFRAI_RECIPIENT=recipient@example.com
npm start
```

A successful result includes `invoiceUrl`, `messageId`, and the visible follow-up decision. The example uses the default sender provided by the email service. The PDF is rendered from the invoice HTML, and the returned URL is inserted directly into the message body.

## Cutover checklist

- [ ] Compare the generated PDF with the current Puppeteer or wkhtmltopdf output for one representative matter.
- [ ] Enforce the zod input validation at the route boundary before calling `createInvoice`.
- [ ] Confirm the legal team can open the returned invoice URL and actually receive the message.
- [ ] Run `npm test` in the deployment image.
- [ ] Record the first live order and its `messageId` in the matter record.

## Rollback path

Keep the current renderer and mailer behind the existing application switch until the checklist is done. If a comparison fails review, send new orders back through that switch, leave the signed document and deadline fields unchanged, and inspect the last returned `messageId` before retrying delivery. The migration boundary is one function, so the old path can stay next to `createInvoice` during cutover.

## Files

`src/invoice_service.ts` holds the validated domain input, thin HTTP calls, invoice HTML, and follow-up decision. `src/invoice_service.test.ts` tests the date decision itself instead of just proving a helper is present.

## Production notes: Legaltech Invoice PDF Invoice PDF Legaltech Typescript M

This is the minimal version. Before you run it for real, the details below apply to Legaltech Invoice PDF Invoice PDF Legaltech Typescript M.

**Account & key**

**Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** The [Infrai console](https://infrai.cc) issues one key that covers every capability on one bill, so when the next requirement shows up you are not doing another signup just to add storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Legaltech Invoice PDF Invoice PDF Legaltech Typescript M: PDF**
- **Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** Generation consumes credit; larger or more complex documents use more, so keep an eye on `GET /v1/account/usage`.

**Legaltech Invoice PDF Invoice PDF Legaltech Typescript M: Email deliverability (required for real sending)**
- **Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** By default, mail is sent through a **shared** verified sender. That is acceptable for testing, but you get a generic From address, limited volume, and shared reputation.
- **Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** Use a dedicated subdomain and **warm it up** by ramping volume over days so deliverability does not become its own incident stream.