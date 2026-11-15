# RSVP: connecting the website to the guest list

Replies are written straight into the private "Wedding Spreadsheet" Google Sheet by a small Google Apps Script attached to it. Setting it up takes about five minutes and is done once.

## 1. Add the script to the sheet
1. Open the Wedding Spreadsheet in Google Sheets.
2. Go to **Extensions → Apps Script**.
3. Delete whatever is in the editor, paste in everything from `Code.gs`, and click **Save**.

## 2. Run the setup once
1. In the toolbar, choose the function **setup** and click **Run**.
2. Google asks for permission to let the script use your spreadsheet. Click through and allow it (you may need **Advanced → Go to project**, because it's your own unpublished script).
3. Back in the sheet, the reply columns now appear on the right of the Guest list: RSVP, Friday, Sunday, Dietary & access, Song request, Plus-one name, Reply email, Message to us, Replied by, Replied at.

## 3. Publish it for the website
1. Click **Deploy → New deployment**.
2. Select type **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Send that URL to Claude, which adds it to the website.

"Anyone" means the website can talk to the script. It doesn't share the sheet: guests can only find themselves by name, and the script never sends anyone the guest list, other people's details, emails or dietary answers.

## Optional: an email for every reply
In Apps Script, go to **Project Settings → Script properties**, add `NOTIFY_EMAIL` with your email address, and save.

## Emails to guests
The script sends emails from the Google account that owns the sheet, under the name "Hannah & Lawrence". Guests will see that account's address and replies come back to it. To have replies go elsewhere, add a Script property `REPLY_TO` with that address.

- **A copy of their reply** goes out automatically whenever someone replies and gives an email address (or already has one in the sheet). It lists each person's answer and how to change it. Dietary and access answers are never included.
- **Reminders** go to households where nobody has replied yet and the sheet holds an email for someone in them. One email per address, greeting everyone in the household. Each is stamped in the "Reminded at" column.
  - Run **previewReminders** at any time to see who would get one, and how many guests have no email address yet. Nothing is sent.
  - Run **scheduleReminders** once to send them automatically on 8 and 24 February 2027 (change `REMINDER_DATES` at the top of the script first if you'd like other dates). Reminders can never go out before 1 February 2027 or after replies close.
- Run **sendSampleEmails** to send yourself one of each, so you can see exactly what guests get.
- The first time you run any of these, Google asks for permission to send email as you. Allow it.

Google lets a personal account send 100 emails a day, which is plenty here.

## If you change the script later
Use **Deploy → Manage deployments → Edit → Version: New version → Deploy**, so the URL stays the same.

## Good to know
- Guests are found by first name (or anything in "Also known as") plus surname. Anyone without a surname in the sheet can't be found yet.
- Everyone sharing a "Household" name is offered to the guest who replies.
- Every reply is also copied to the "RSVP log" tab.
- Replies close automatically at the end of 1 March 2027.
- Keep the sheet shared with Hannah and Lawrence only.
