# Prompt: request a printed invitation at RSVP

## Goal
Let guests ask for a printed invitation by post while they reply, without making the reply feel longer for everyone else.

Judge it by the two tests:
- **Does it remove a worry?** Yes. Guests who'd like something to keep, often older relatives, can ask for one without messaging us.
- **Does it build excitement?** Yes. A printed card on the mantelpiece is a daily reminder.

## Behaviour
1. **One quiet tickbox at the end of the reply**, under the email field: "I'd like a printed invitation by post". It's off by default.
2. **Ticking it reveals the address fields** in place, then focuses the first one:
   - **Address** (required)
   - **Address line 2** (optional)
   - **Town or city** (required)
   - **Postcode or Eircode** (required)
   - **Country** (required, pre-filled "United Kingdom")

   Use the correct `autocomplete` values, so phones can fill them in automatically.
3. **The reply can't be sent while ticked without a full address.** Highlight the missing fields, focus the first one, and say: "Please add your full address so we can post your invitation." The server checks this too and refuses an incomplete request (`address_needed`).
4. **One request per household**, recorded on the row of the person replying.
5. **Returning guests:**
   - If anyone in the household has already asked, the box shows as ticked.
   - If an address is on file, say: "We already have an address for you. Only fill this in if it has changed." The fields are then optional.
   - Unticking the box cancels the request but keeps the address.
6. **Confirmation:**
   - The thank-you screen adds "We'll post your printed invitation to you."
   - The confirmation email adds "We'll post a printed invitation to the address you gave us."

## Privacy (GDPR)
- The address is **write-only**, like dietary notes. It's saved to the sheet, but never sent back to the website or included in any email, because anyone with the site password could type in a guest's name.
- Show "Only we see this, and we'll use it just to post your invitation." under the fields.
- Collect no more than the fields above.

## Sheet
Two columns are added automatically by `setup()` or on the first reply:
- **Printed invitation:** "Requested", or blank.
- **Postal address:** one line, comma-separated.

## Tests
- A tick with an incomplete address is refused.
- A complete address is saved on the replier's row.
- The address never appears in the find response.
- An address on file is reused when the box is ticked without a new one.
- Unticking clears the request and keeps the address.
- The confirmation email mentions the printed invitation.
