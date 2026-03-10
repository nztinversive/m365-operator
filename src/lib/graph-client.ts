import { Client } from "@microsoft/microsoft-graph-client";

export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  receivedDateTime: string;
  bodyPreview: string;
  body: { content: string; contentType: string };
  isRead: boolean;
  hasAttachments: boolean;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  organizer?: { emailAddress: { name: string; address: string } };
  bodyPreview: string;
}

export async function getUnreadEmails(
  client: Client,
  count = 10
): Promise<EmailMessage[]> {
  const result = await client
    .api("/me/mailFolders/inbox/messages")
    .filter("isRead eq false")
    .top(count)
    .orderby("receivedDateTime desc")
    .select("id,subject,from,receivedDateTime,bodyPreview,body,isRead,hasAttachments")
    .get();
  return result.value;
}

export async function getRecentEmails(
  client: Client,
  count = 20
): Promise<EmailMessage[]> {
  const result = await client
    .api("/me/mailFolders/inbox/messages")
    .top(count)
    .orderby("receivedDateTime desc")
    .select("id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments")
    .get();
  return result.value;
}

export async function getTodayEvents(
  client: Client
): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const result = await client
    .api("/me/calendarView")
    .query({ startDateTime: startOfDay, endDateTime: endOfDay })
    .orderby("start/dateTime")
    .select("id,subject,start,end,location,organizer,bodyPreview")
    .get();
  return result.value;
}

export async function sendEmail(
  client: Client,
  to: string,
  subject: string,
  body: string,
  contentType: "Text" | "HTML" = "HTML"
): Promise<void> {
  await client.api("/me/sendMail").post({
    message: {
      subject,
      body: { contentType, content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
  });
}

export async function uploadToOneDrive(
  client: Client,
  fileName: string,
  content: ArrayBuffer,
  folder = "M365 Operator"
): Promise<{ id: string; webUrl: string }> {
  const result = await client
    .api(`/me/drive/root:/${folder}/${fileName}:/content`)
    .put(content);
  return { id: result.id, webUrl: result.webUrl };
}

export async function getUserProfile(client: Client) {
  return await client.api("/me").select("displayName,mail,userPrincipalName").get();
}
