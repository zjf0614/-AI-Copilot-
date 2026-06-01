import { messageLinkRepo, messageRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { UnfurlPreview } from '@nexusflow/shared';
import { unfurlUrl } from '../utils/unfurl.js';

export class ReferenceService {
  async createLink(sourceMessageId: string, targetResourceType: string, targetResourceId: string, targetMessageId?: string) {
    let previewData: UnfurlPreview = { url: `${targetResourceType}:${targetResourceId}`, type: targetResourceType as any };

    // If referencing a message, fetch preview
    if (targetResourceType === 'message' && targetMessageId) {
      const msg = await messageRepo.findById(targetMessageId);
      if (msg) {
        previewData = {
          url: previewData.url,
          type: 'message',
          title: `Message by ${msg.userId}`,
          description: (msg.content as any)?.text?.slice(0, 500) ?? '',
        };
      }
    }

    return messageLinkRepo.create({ sourceMessageId, targetMessageId, targetResourceType, targetResourceId, previewData });
  }

  async getBacklinks(targetResourceType: string, targetResourceId: string) {
    return messageLinkRepo.findBacklinks(targetResourceType, targetResourceId);
  }

  async unfurl(resourceType: string, resourceId: string, url?: string): Promise<UnfurlPreview> {
    if (resourceType === 'message') {
      const msg = await messageRepo.findById(resourceId);
      if (!msg) throw AppError.notFound('Message');
      return { url: `message:${resourceId}`, type: 'message', title: 'Message Reference', description: (msg.content as any)?.text?.slice(0, 300) ?? '' };
    }
    if (url) return unfurlUrl(url);
    return { url: `${resourceType}:${resourceId}`, type: resourceType as any };
  }
}

export const referenceService = new ReferenceService();
