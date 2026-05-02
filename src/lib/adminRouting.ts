export const ADMIN_HOST = 'admin.pulalabs.com';
export const MAIN_HOST = 'pulalabs.com';
export const SUPER_ADMIN_DASHBOARD_HASH = '#dashboard/super-admin';
export const IS_ADMIN_PORTAL_BUILD = import.meta.env.VITE_ADMIN_PORTAL === 'true';
export const SUPER_ADMIN_EMAILS = ['superadmin@pulalabs.com', 'superadmin@aivyapari.com'];

export const isSuperAdminEmail = (email?: string | null) =>
  SUPER_ADMIN_EMAILS.includes(email?.trim().toLowerCase() ?? '');

export const isAdminHost = () => IS_ADMIN_PORTAL_BUILD || window.location.hostname === ADMIN_HOST;

export const getAdminDashboardUrl = () => {
  const adminOrigin = `https://${ADMIN_HOST}`;
  return `${adminOrigin}/${SUPER_ADMIN_DASHBOARD_HASH}`;
};

export const redirectToAdminDashboard = () => {
  if (isAdminHost()) {
    window.location.hash = SUPER_ADMIN_DASHBOARD_HASH;
    return;
  }

  window.location.assign(getAdminDashboardUrl());
};
