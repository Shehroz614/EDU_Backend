import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import Announcement from '@edugram/types/announcement';

/**
 * Get Announcement
 * @param announcementId
 */
const getAnnouncement = (announcementId: string) =>
  new Promise<Announcement>(async (resolve, reject) => {
    try {
      if (!announcementId) {
        reject(new HTTPError(400, 'Announcement ID is required'));
        return;
      }
      const announcement = (await models.Announcement.findOne({ _id: announcementId })) as Announcement;
      resolve(announcement);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
/**
 * Create Announcement
 * @param data
 */
const createAnnouncement = (data: {
  description: string;
  actionLink?: string;
  isClosable: boolean;
  isActive: boolean;
  createdBy: string;
}) =>
  new Promise(async (resolve, reject) => {
    try {
      const announcement: Announcement = await models.Announcement.create(data);
      resolve(announcement);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Announcement
 * @param announcementId
 * @param data
 */
const updateAnnouncement = (
  announcementId: string,
  data: {
    description?: string;
    actionLink?: string;
    isClosable?: boolean;
    isActive?: boolean;
    createdBy?: string;
  },
) =>
  new Promise(async (resolve, reject) => {
    try {
      const announcement: Announcement | null = await models.Announcement.findOne({ _id: announcementId });
      if (!announcement) {
        reject(new HTTPError(404, 'Annoucement not found'));
        return;
      }
      await announcement.set(data);
      resolve(announcement);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
};
