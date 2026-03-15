import { HeadingLevel } from 'docx';
import { Client } from '@microsoft/microsoft-graph-client';
import { GraphClientManager } from './graph-client-manager.js';
import { generateWordDocument, generateExcelWorkbook, generatePowerPointPresentation, type WordDocumentSection, type ExcelWorksheetData, type PowerPointSlide } from './document-generators.js';

export interface UploadResult {
  id: string;
  name: string;
  webUrl: string;
  size: number;
}

export class M365Tools {
  constructor(private graphManager: GraphClientManager) {}

  // Email operations
  async getUnreadEmails(client: Client, count = 10): Promise<any[]> {
    const result = await client
      .api('/me/mailFolders/inbox/messages')
      .filter('isRead eq false')
      .top(count)
      .orderby('receivedDateTime desc')
      .select('id,subject,from,receivedDateTime,bodyPreview,body,isRead,hasAttachments,importance')
      .get();
    return result.value;
  }

  async sendEmail(
    client: Client,
    to: string | string[],
    subject: string,
    body: string,
    contentType: 'Text' | 'HTML' = 'HTML'
  ): Promise<void> {
    const toRecipients = Array.isArray(to) 
      ? to.map(email => ({ emailAddress: { address: email } }))
      : [{ emailAddress: { address: to } }];

    await client.api('/me/sendMail').post({
      message: {
        subject,
        body: { contentType, content: body },
        toRecipients,
      },
    });
  }

  // Calendar operations
  async getTodayEvents(client: Client): Promise<any[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const result = await client
      .api('/me/calendarView')
      .query({ startDateTime: startOfDay, endDateTime: endOfDay })
      .orderby('start/dateTime')
      .select('id,subject,start,end,location,organizer,bodyPreview,isOnlineMeeting')
      .get();
    return result.value;
  }

  async createCalendarEvent(
    client: Client,
    subject: string,
    start: Date,
    end: Date,
    attendees?: string[],
    location?: string
  ): Promise<any> {
    const eventData = {
      subject,
      start: {
        dateTime: start.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'UTC',
      },
      ...(attendees && {
        attendees: attendees.map(email => ({
          emailAddress: { address: email },
          type: 'required',
        })),
      }),
      ...(location && { location: { displayName: location } }),
    };

    return await client.api('/me/calendar/events').post(eventData);
  }

  // Teams operations
  async getJoinedTeams(client: Client): Promise<any[]> {
    const result = await client
      .api('/me/joinedTeams')
      .select('id,displayName,description')
      .get();
    return result.value;
  }

  async getTeamChannels(client: Client, teamId: string): Promise<any[]> {
    const result = await client
      .api(`/teams/${teamId}/channels`)
      .select('id,displayName,description,membershipType')
      .get();
    return result.value;
  }

  async sendChannelMessage(
    client: Client,
    teamId: string,
    channelId: string,
    message: string,
    subject?: string
  ): Promise<void> {
    const messageData = {
      body: {
        contentType: 'html',
        content: message,
      },
      ...(subject && { subject }),
    };

    await client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .post(messageData);
  }

  // File operations
  async uploadDocument(
    client: Client,
    fileName: string,
    content: Buffer,
    folder = 'M365 Operator',
    fileType?: string
  ): Promise<UploadResult> {
    // Ensure proper file extension
    const extMap: Record<string, string> = { word: '.docx', excel: '.xlsx', powerpoint: '.pptx' };
    if (fileType && extMap[fileType] && !fileName.endsWith(extMap[fileType])) {
      // Strip any existing wrong extension and add the right one
      fileName = fileName.replace(/\.\w+$/, '') + extMap[fileType];
    }

    try {
      const result = await client
        .api(`/me/drive/root:/${folder}/${fileName}:/content`)
        .put(content);

      return {
        id: result.id,
        name: result.name,
        webUrl: result.webUrl,
        size: result.size,
      };
    } catch (error) {
      console.error('❌ Failed to upload document:', error);
      throw new Error(`Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadToSharePoint(
    client: Client,
    siteId: string,
    fileName: string,
    content: Buffer,
    folder?: string
  ): Promise<UploadResult> {
    try {
      const path = folder ? `${folder}/${fileName}` : fileName;
      const result = await client
        .api(`/sites/${siteId}/drive/root:/${path}:/content`)
        .put(content);

      return {
        id: result.id,
        name: result.name,
        webUrl: result.webUrl,
        size: result.size,
      };
    } catch (error) {
      console.error('❌ Failed to upload to SharePoint:', error);
      throw new Error(`SharePoint upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Document generation
  async generateBriefingDocument(briefingContent: string): Promise<Buffer> {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const sections: WordDocumentSection[] = [
      {
        type: 'paragraph',
        content: `Date: ${dateStr}`,
      },
      {
        type: 'heading',
        content: 'Executive Summary',
        level: HeadingLevel.HEADING_1,
      },
      {
        type: 'paragraph',
        content: briefingContent,
      },
    ];

    return generateWordDocument('Daily Briefing', sections);
  }

  async generateMeetingRecap(data: {
    meeting: string;
    date: string;
    attendees: string[];
    summary: string;
    actionItems: { item: string; owner: string; deadline?: string }[];
  }): Promise<Buffer> {
    const sections: WordDocumentSection[] = [
      {
        type: 'paragraph',
        content: `Meeting: ${data.meeting}\nDate: ${data.date}\nAttendees: ${data.attendees.join(', ')}`,
      },
      {
        type: 'heading',
        content: 'Meeting Summary',
        level: HeadingLevel.HEADING_1,
      },
      {
        type: 'paragraph',
        content: data.summary,
      },
      {
        type: 'heading',
        content: 'Action Items',
        level: HeadingLevel.HEADING_1,
      },
      {
        type: 'table',
        content: '',
        tableData: {
          headers: ['Action Item', 'Owner', 'Deadline'],
          rows: data.actionItems.map(item => [
            item.item,
            item.owner,
            item.deadline || 'TBD',
          ]),
        },
      },
    ];

    return generateWordDocument('Meeting Recap', sections);
  }

  async generateStatusDeck(data: {
    title: string;
    wins: string[];
    challenges: string[];
    metrics: { name: string; value: string; trend?: string }[];
    nextSteps: string[];
  }): Promise<Buffer> {
    const slides: PowerPointSlide[] = [
      {
        title: 'Key Wins',
        bullets: data.wins,
      },
      {
        title: 'Challenges & Blockers',
        bullets: data.challenges,
      },
      {
        title: 'Key Metrics',
        bullets: data.metrics.map(
          metric => `${metric.name}: ${metric.value}${metric.trend ? ` (${metric.trend})` : ''}`
        ),
      },
      {
        title: 'Next Steps',
        bullets: data.nextSteps,
      },
    ];

    return generatePowerPointPresentation(data.title, slides);
  }

  async generateTracker(data: {
    title: string;
    worksheets: ExcelWorksheetData[];
  }): Promise<Buffer> {
    return generateExcelWorkbook(data.worksheets);
  }

  // User profile operations
  async getUserProfile(client: Client): Promise<any> {
    return await client
      .api('/me')
      .select('displayName,mail,userPrincipalName,jobTitle,department')
      .get();
  }

  // Search operations
  async searchEmails(client: Client, query: string, count = 25): Promise<any[]> {
    const result = await client
      .api('/me/mailFolders/inbox/messages')
      .search(query)
      .top(count)
      .select('id,subject,from,receivedDateTime,bodyPreview,isRead')
      .get();
    return result.value;
  }

  async searchFiles(client: Client, query: string, count = 25): Promise<any[]> {
    const result = await client
      .api(`/me/drive/root/search(q='${query}')`)
      .top(count)
      .select('id,name,webUrl,size,lastModifiedDateTime,file,folder')
      .get();
    return result.value;
  }

  // Excel operations
  async updateExcelWorksheet(
    client: Client,
    driveItemId: string,
    worksheetName: string,
    range: string,
    values: any[][]
  ): Promise<void> {
    await client
      .api(`/me/drive/items/${driveItemId}/workbook/worksheets('${worksheetName}')/range(address='${range}')`)
      .patch({
        values: values,
      });
  }

  async addExcelTable(
    client: Client,
    driveItemId: string,
    worksheetName: string,
    range: string,
    tableName: string,
    hasHeaders = true
  ): Promise<any> {
    return await client
      .api(`/me/drive/items/${driveItemId}/workbook/worksheets('${worksheetName}')/tables/add`)
      .post({
        address: range,
        hasHeaders: hasHeaders,
        name: tableName,
      });
  }
}
