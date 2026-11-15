# Prompt: luxurious RSVP emails for Hannah & Lawrence

## Who you are
You are a senior email designer who has built transactional emails for luxury hotels and fashion houses. You know what survives in real inboxes (Gmail, Apple Mail, Outlook) and what doesn't. Your job is to redesign the three emails our RSVP sends, so that opening one feels like opening a beautifully printed card.

## The wedding
- Hannah & Lawrence, Saturday 18 September 2027, Markree Castle, Collooney, Co. Sligo, Ireland.
- Black tie. A destination wedding: most guests travel from the UK and abroad.
- The website is hannahandlawrence.com. Guests reply there, and the password is on their printed invitation.
- Replies close on 1 March 2027.
- Guests arrive from 2pm. Nothing else about timings goes in these emails.
- Never invent times, places, names or details. If something would be nice but isn't confirmed, leave it out and list it as a question at the end.

## The two tests
Judge every idea by both:
1. Does it remove a worry or a question for the guest?
2. Does it make them more excited to be there?

If an element passes neither, cut it.

## Voice
- Elegant, warm and understated, written in our voice ("we", "us").
- No wedding-industry clichés: no "big day", "tie the knot", "happily ever after", "save the date" puns.
- A tasteful touch of Irish is welcome, nothing kitsch: no shamrocks or leprechauns. The website footer already says "Go raibh maith agaibh" (thank you, to many).
- Short. Guests should be able to read each email in under 20 seconds.

## The three emails
Keep the facts and logic of the current copy. You may improve the wording, as long as it says the same things.

**1. "See you at Markree"** (sent when anyone in the reply is coming)
- Greeting to everyone the reply covers, e.g. "Dear Lee and Jenny".
- Thank you, and joy that they'll be with us at Markree Castle on Saturday 18 September 2027.
- "Here's what we have": one line per person, e.g.
  - "Lee: joyfully accepts, plus Friday drinks and Sunday"
  - "Jenny: joyfully accepts, with Sam" (plus-one)
  - "Ann: regretfully declines"
- Guests arrive from 2pm, and it's black tie. More about the weekend (travel, where to stay) will follow on the website.
- They can update their reply until 1 March 2027 at hannahandlawrence.com/#rsvp. The password is on their invitation.
- Sign-off: "With love, Hannah & Lawrence".

**2. "Thank you for letting us know"** (sent when everyone in the reply declines)
- Thank you. We'll miss them, and we'll raise a glass to them at Markree.
- The same "Here's what we have" list.
- The same note about changing their reply.
- This one should feel kind and light, never guilt-inducing. Keep it shorter and quieter than email 1.

**3. "A gentle reminder: replies by 1 March"** (February, to households that haven't replied)
- We'd love to know whether they can join us. Replies close on 1 March, and it takes a minute.
- One clear "Reply now" button to hannahandlawrence.com/#rsvp. The password is on their invitation.
- "If you've already let us know another way, thank you, and please ignore this."
- Warm, never nagging.

Dietary and access answers must **never** appear in any email.

## Visual identity
Match the website's "party" palette, Ivory & bottle with small pops of colour:
- Ivory background `#FBF8F1`, deep bottle green text `#1E3829`, antique gold accents `#B8925A`.
- Small floral accents may use the site's peony, marigold, cornflower and heather. Use them sparingly, like a sprig on a card, never a border of flowers.
- Typography: a refined serif. Web fonts only work in some inboxes, so design with **Georgia** as the real font and treat any web font (e.g. Cormorant Garamond) as a bonus that degrades gracefully.
- Generous margins, letter-spaced small capitals for labels (e.g. HANNAH & LAWRENCE · 18 SEPTEMBER 2027), thin gold rules.
- The overall effect should be a printed card, not a marketing newsletter: no hero banners, coloured blocks or social icons.

## The wolfhound
Include the illustration of Fionn, Markree's resident Irish wolfhound, which sits in the website footer (a line illustration in bottle green).
- Use him with restraint: one small, charming appearance per email, e.g. sitting by the sign-off, or peeking in above the footer.
- In the reminder email he can carry the warmth, e.g. sitting patiently by the "Reply now" button.
- He must never be the main event or appear more than once per email.
- Give him alt text, e.g. "Fionn, Markree's wolfhound". The email must read perfectly with images turned off, which is Outlook's default.
- Don't promise in words that Fionn will be at the wedding. Markree hasn't confirmed it.

**Image handling (important):**
- Email clients block images embedded in the HTML as base64, so the image must be hosted at a public URL. Plan to host it on the website, e.g. `https://hannahandlawrence.com/email/fionn.png`.
- On the site he's made of three separate WebP layers (body, head, tail) for an animation. For email, you need **one flattened PNG** (WebP doesn't display in Outlook) on a transparent or ivory background.
  - Export it at 2× the display size, e.g. 240px wide if shown at 120px.
  - Keep it under 40 KB.
- Specify the exact file you need: name, size, background.

## Technical constraints
- The emails are sent by Google Apps Script using `GmailApp.sendEmail(to, subject, plainText, { htmlBody, from, name })`. The HTML is a single string built in JavaScript.
- Use table-based layout with **inline styles only**. You can add a `<style>` block for media queries and dark mode, but nothing may depend on it.
- Maximum width 560px, single column, and fully readable on a 375px phone.
- Keep the total HTML under 60 KB. Gmail clips anything over 102 KB and hides it behind "View entire message".
- Dark mode: test that Apple Mail and Gmail's dark themes don't invert the ivory into something muddy, or turn the green text unreadable. Use `color-scheme` meta tags and sensible fallbacks.
- Add a hidden preheader line for each email (the grey preview text in the inbox list), e.g. "Lee and Jenny, we can't wait to see you at Markree."
- Buttons must be bulletproof: built from table cells, not images, with at least a 44px tap height.
- Every link uses the full URL `https://hannahandlawrence.com/...`.
- Every email must have a plain-text version that reads well on its own.
- Escape every guest-supplied value (names, plus-one names) before putting it into the HTML.

## How to work
1. **Show three short directions first**, before building anything, for example:
   - "Engraved card": formal, symmetrical, monogram knot.
   - "Garden note": softer, with one floral sprig and Fionn by the sign-off.
   - A third of your own.

   For each, give a one-paragraph description and a rendered mock-up of email 1 at phone width. Stop and let us choose.
2. **Then build all three emails** in the chosen direction.

## What to deliver
1. One standalone `email-preview.html` that shows all three emails side by side at 375px and 600px, with sample data (Lee and Jenny Byers coming, one with Friday and Sunday; Ann declining; a reminder to Lee and Jenny), plus a dark-mode preview.
2. Drop-in replacements for these functions in `rsvp/Code.gs`, with the same names and inputs so nothing else changes:
   - `confirmationEmail(info)`, which returns `{ subject, text, html }`
   - `reminderEmail(firstNames)`
   - `emailShell_(inner)`
3. The exact Fionn image file spec, and where it should live on the website.
4. A short test checklist: Gmail web, the Gmail iPhone app, Apple Mail light and dark, Outlook.com, and images-off.
5. Questions for us, plus anything that needs checking with Markree.
