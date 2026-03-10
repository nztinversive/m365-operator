import { Client } from "@microsoft/microsoft-graph-client";

// Types
export interface MailMessage {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  toRecipients: { emailAddress: { name: string; address: string } }[];
  receivedDateTime: string;
  bodyPreview: string;
  body: { content: string; contentType: string };
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
  conversationId?: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  organizer?: { emailAddress: { name: string; address: string } };
  attendees?: { emailAddress: { name: string; address: string }; status: { response: string } }[];
  bodyPreview: string;
  isOnlineMeeting?: boolean;
  onlineMeeting?: { joinUrl: string };
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description: string;
  membershipType: string;
}

export interface Team {
  id: string;
  displayName: string;
  description?: string;
}

export interface TeamsMessage {
  id: string;
  messageType: string;
  createdDateTime: string;
  from: { user?: { displayName: string; id: string } };
  body: { content: string; contentType: string };
  subject?: string;
}

export interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: string;
  createdDateTime: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
}

export interface ExcelWorksheet {
  id?: string;
  name: string;
  position?: number;
  visibility?: string;
}

export type ExcelCellValue = string | number | boolean | null;

type StreamLike = {
  on(event: "data", listener: (chunk: Buffer) => void): StreamLike;
  on(event: "end", listener: () => void): StreamLike;
  on(event: "error", listener: (error: Error) => void): StreamLike;
};

// Email Operations
export async function getUnreadEmails(
  client: Client,
  count = 10,
  folder = "inbox"
): Promise<MailMessage[]> {
  const result = await client
    .api(`/me/mailFolders/${folder}/messages`)
    .filter("isRead eq false")
    .top(count)
    .orderby("receivedDateTime desc")
    .select("id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,isRead,hasAttachments,importance,conversationId")
    .get();
  return result.value;
}

export async function getEmailsByDateRange(
  client: Client,
  startDate: Date,
  endDate: Date,
  count = 50
): Promise<MailMessage[]> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  
  const result = await client
    .api("/me/mailFolders/inbox/messages")
    .filter(`receivedDateTime ge ${startISO} and receivedDateTime le ${endISO}`)
    .top(count)
    .orderby("receivedDateTime desc")
    .select("id,subject,from,receivedDateTime,bodyPreview,isRead,importance")
    .get();
  return result.value;
}

export async function sendEmail(
  client: Client,
  to: string | string[],
  subject: string,
  body: string,
  contentType: "Text" | "HTML" = "HTML",
  cc?: string[],
  bcc?: string[]
): Promise<void> {
  const toRecipients = Array.isArray(to) 
    ? to.map(email => ({ emailAddress: { address: email } }))
    : [{ emailAddress: { address: to } }];
  
  const ccRecipients = cc?.map(email => ({ emailAddress: { address: email } }));
  const bccRecipients = bcc?.map(email => ({ emailAddress: { address: email } }));

  await client.api("/me/sendMail").post({
    message: {
      subject,
      body: { contentType, content: body },
      toRecipients,
      ...(ccRecipients && { ccRecipients }),
      ...(bccRecipients && { bccRecipients }),
    },
  });
}

export async function replyToEmail(
  client: Client,
  messageId: string,
  replyText: string,
  replyAll = false
): Promise<void> {
  const endpoint = replyAll ? "replyAll" : "reply";
  await client.api(`/me/messages/${messageId}/${endpoint}`).post({
    message: {
      body: {
        contentType: "HTML",
        content: replyText,
      },
    },
  });
}

// Calendar Operations
export async function getCalendarEvents(
  client: Client,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const result = await client
    .api("/me/calendarView")
    .query({ startDateTime: startISO, endDateTime: endISO })
    .orderby("start/dateTime")
    .select("id,subject,start,end,location,organizer,attendees,bodyPreview,isOnlineMeeting,onlineMeeting")
    .get();
  return result.value;
}

export async function getTodayEvents(client: Client): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  return getCalendarEvents(client, startOfDay, endOfDay);
}

export async function createCalendarEvent(
  client: Client,
  subject: string,
  start: Date,
  end: Date,
  attendees?: string[],
  location?: string,
  body?: string
): Promise<CalendarEvent> {
  const eventData = {
    subject,
    start: {
      dateTime: start.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "UTC",
    },
    ...(attendees && {
      attendees: attendees.map(email => ({
        emailAddress: { address: email },
        type: "required",
      })),
    }),
    ...(location && { location: { displayName: location } }),
    ...(body && {
      body: {
        contentType: "HTML",
        content: body,
      },
    }),
  };

  return await client.api("/me/calendar/events").post(eventData);
}

// Teams Operations
export async function getJoinedTeams(client: Client): Promise<Team[]> {
  const result = await client
    .api("/me/joinedTeams")
    .select("id,displayName,description")
    .get();
  return result.value;
}

export async function getTeamChannels(
  client: Client,
  teamId: string
): Promise<TeamsChannel[]> {
  const result = await client
    .api(`/teams/${teamId}/channels`)
    .select("id,displayName,description,membershipType")
    .get();
  return result.value;
}

export async function getChannelMessages(
  client: Client,
  teamId: string,
  channelId: string,
  count = 20
): Promise<TeamsMessage[]> {
  const result = await client
    .api(`/teams/${teamId}/channels/${channelId}/messages`)
    .top(count)
    .orderby("createdDateTime desc")
    .select("id,messageType,createdDateTime,from,body,subject")
    .get();
  return result.value;
}

export async function sendChannelMessage(
  client: Client,
  teamId: string,
  channelId: string,
  message: string,
  subject?: string
): Promise<void> {
  const messageData = {
    body: {
      contentType: "html",
      content: message,
    },
    ...(subject && { subject }),
  };

  await client
    .api(`/teams/${teamId}/channels/${channelId}/messages`)
    .post(messageData);
}

// OneDrive/SharePoint Operations
export async function uploadToOneDrive(
  client: Client,
  fileName: string,
  content: ArrayBuffer,
  folder = "M365 Operator"
): Promise<DriveItem> {
  const result = await client
    .api(`/me/drive/root:/${folder}/${fileName}:/content`)
    .put(content);
  return result;
}

export async function uploadToSharePoint(
  client: Client,
  siteId: string,
  fileName: string,
  content: ArrayBuffer,
  folder?: string
): Promise<DriveItem> {
  const path = folder ? `${folder}/${fileName}` : fileName;
  const result = await client
    .api(`/sites/${siteId}/drive/root:/${path}:/content`)
    .put(content);
  return result;
}

export async function createSharePointFolder(
  client: Client,
  siteId: string,
  folderName: string,
  parentFolder = ""
): Promise<DriveItem> {
  const parentPath = parentFolder ? `${parentFolder}/` : "";
  const result = await client
    .api(`/sites/${siteId}/drive/root:/${parentPath}${folderName}`)
    .patch({
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    });
  return result;
}

export async function listOneDriveItems(
  client: Client,
  folder = ""
): Promise<DriveItem[]> {
  const endpoint = folder 
    ? `/me/drive/root:/${folder}:/children`
    : "/me/drive/root/children";
  
  const result = await client
    .api(endpoint)
    .select("id,name,webUrl,size,lastModifiedDateTime,createdDateTime,file,folder")
    .get();
  return result.value;
}

export async function getOneDriveItem(
  client: Client,
  itemId: string
): Promise<DriveItem> {
  return await client
    .api(`/me/drive/items/${itemId}`)
    .select("id,name,webUrl,size,lastModifiedDateTime,createdDateTime,file,folder")
    .get();
}

export async function downloadOneDriveItem(
  client: Client,
  itemId: string
): Promise<ArrayBuffer> {
  const response = await client
    .api(`/me/drive/items/${itemId}/content`)
    .getStream() as StreamLike;
  
  // Convert stream to ArrayBuffer
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    response.on("data", (chunk) => chunks.push(chunk));
    response.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      });
    response.on('error', reject);
  });
}

// Excel Operations
export async function getExcelWorksheets(
  client: Client,
  driveItemId: string
): Promise<ExcelWorksheet[]> {
  const result = await client
    .api(`/me/drive/items/${driveItemId}/workbook/worksheets`)
    .get();
  return result.value;
}

export async function updateExcelRange(
  client: Client,
  driveItemId: string,
  worksheetName: string,
  range: string,
  values: ExcelCellValue[][]
): Promise<void> {
  await client
    .api(`/me/drive/items/${driveItemId}/workbook/worksheets('${worksheetName}')/range(address='${range}')`)
    .patch({
      values: values,
    });
}

export async function addExcelTable(
  client: Client,
  driveItemId: string,
  worksheetName: string,
  range: string,
  tableName: string,
  hasHeaders = true
): Promise<Record<string, unknown>> {
  return await client
    .api(`/me/drive/items/${driveItemId}/workbook/worksheets('${worksheetName}')/tables/add`)
    .post({
      address: range,
      hasHeaders: hasHeaders,
      name: tableName,
    });
}

// User Profile Operations
export async function getUserProfile(client: Client) {
  return await client
    .api("/me")
    .select("displayName,mail,userPrincipalName,jobTitle,department,officeLocation")
    .get();
}

export async function getUserPhoto(client: Client): Promise<ArrayBuffer | null> {
  try {
    const response = await client.api("/me/photo/$value").get();
    return response;
  } catch {
    // No photo available
    return null;
  }
}

// Search Operations
export async function searchEmails(
  client: Client,
  query: string,
  count = 25
): Promise<MailMessage[]> {
  const result = await client
    .api("/me/mailFolders/inbox/messages")
    .search(query)
    .top(count)
    .select("id,subject,from,receivedDateTime,bodyPreview,isRead")
    .get();
  return result.value;
}

export async function searchOneDrive(
  client: Client,
  query: string,
  count = 25
): Promise<DriveItem[]> {
  const escapedQuery = query.replace(/'/g, "''");
  const result = await client
    .api(`/me/drive/root/search(q='${escapedQuery}')`)
    .top(count)
    .select("id,name,webUrl,size,lastModifiedDateTime,file,folder")
    .get();
  return result.value;
}
