import api from '../api.js';
import { unwrap } from '../helpers.js';

/** Module Notifications : liste, non-lues, marquage lu, broadcasts. */

export const listerNotifications = async ({ page = 1, limit = 20, nonLues = false } = {}) => {
  const response = await api.get('/notifications', {
    params: { page, limit, nonLues: nonLues || undefined },
  });
  const data = unwrap(response);
  return {
    items: data?.notifications || [],
    total: data?.total ?? 0,
    nonLuesCount: data?.nonLuesCount ?? 0,
  };
};

export const compterNonLues = async () => {
  const response = await api.get('/notifications/non-lues/count');
  return unwrap(response)?.nonLuesCount ?? 0;
};

export const marquerLues = async (ids) => {
  const response = await api.patch('/notifications/lues', ids?.length ? { ids } : {});
  return unwrap(response);
};

export const broadcastOrganisation = async (body) => {
  const response = await api.post('/notifications/broadcast/organisation', body);
  return unwrap(response);
};

export const broadcastChantier = async (chantierId, body) => {
  const response = await api.post(`/notifications/broadcast/chantiers/${chantierId}`, body);
  return unwrap(response);
};
