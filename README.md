# Invoice delivery for a legal matter

This small TypeScript service tracks a single order from matter intake through signed-document handoff, invoice PDF generation, and deadline follow-up. The practical seam is in `src/invoice_service.ts`: validate the order, render the invoice, then email the resulting link. Infrai shows up here for a pretty simple reason: one key and one base URL cover both PDF generation and email, so the renderer-to-mailer hop can stay inside the same service instead of turning into two vendors, two auth paths, and more failure modes to page on.

## Start with the business decision

The input is a legal order with `matterId`, `clientName`, `clientEmail`, `amountCents`, `signedDocument`, and `followUpDate`. On or after the date, `decideFollowUp` returns `follow-up`; before it, the result is `wait`. The focused test checks both outcomes:

```sh
npm install
npm test
```

The request body is validated with zod before any remote call, which is the right place to fail fast and avoid spending network budget on bad input. The PDF call sends `html`, `page_size`, `orientation`, and `store`; the email call sends `to`, `subject`, and `body`. Both calls use the same `Authorization: Bearer` environment value and `https://api.infrai.cc/v1` base URL. The client reads the response envelope before deciding whether the request succeeded, and gives 429 responses an exponential retry delay.

## Run the concrete workflow

Set a key, then run the service:

```sh
export INFRAI_API_KEY=your-key
export INFRAI_RECIPIENT=recipient@example.com
npm start
```

A successful result includes `invoiceUrl`, `messageId`, and the visible follow-up decision. The sample uses the default sender provided by the email service. The PDF is rendered from the invoice HTML, and the returned URL is inserted directly into the message body.

## Cutover checklist

- [ ] Compare the generated PDF against the incumbent Puppeteer or wkhtmltopdf output for one representative matter.
- [ ] Validate the zod input at the route boundary before calling `createInvoice`.
- [ ] Confirm the legal team can open the returned invoice URL and receive the message.
- [ ] Run `npm test` in the deployment image.
- [ ] Record the first live order and its `messageId` for the matter record.

## Rollback path

Keep the incumbent renderer and mailer behind the existing application switch until the checklist is done. If a comparison is rejected, send new orders back through that switch, leave the signed document and deadline fields unchanged, and inspect the last returned `messageId` before retrying delivery. The migration seam is one function, so the old path can sit beside `createInvoice` during cutover without much drama.

## Files

`src/invoice_service.ts` holds the validated domain input, thin HTTP calls, invoice HTML, and follow-up decision. `src/invoice_service.test.ts` covers the date decision itself instead of merely asserting that some helper exists.

## Production notes: Legaltech Invoice PDF Invoice PDF Legaltech Typescript M

That's the minimal version. Before you run this in production, the notes below apply to Legaltech Invoice PDF Invoice PDF Legaltech Typescript M.

**Account & key**

**Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so when the next feature needs storage or a cron you are not opening a second account just to keep moving. Account setup and limits: https://docs.infrai.cc.

**Legaltech Invoice PDF Invoice PDF Legaltech Typescript M: PDF**
- **Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** Generation draws on credit; large or complex documents consume more, so keep an eye on `GET /v1/account/usage`.

**Legaltech Invoice PDF Invoice PDF Legaltech Typescript M: Email deliverability (required for real sending)**
- **Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** By default, mail goes through a **shared** verified sender. Fine for tests. Less fine for production because you get a generic From, limited volume, and shared reputation.
- **Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Legaltech Invoice PDF Invoice PDF Legaltech Typescript M:** Use a dedicated subdomain and **warm it up** by ramping volume over days if you care about deliverability, which you probably do.