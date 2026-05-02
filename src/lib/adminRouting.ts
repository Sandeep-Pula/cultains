export const ADMIN_HOST = 'admin.pulalabs.com';
export const MAIN_HOST = 'pulalabs.com';
export const SUPER_ADMIN_DASHBOARD_HASH = '#dashboard/super-admin';

export const isSuperAdminEmail = (email?: string | null) =>
  email?.trim().toLowerCase() === 'superadmin@pulalabs.com';

export const isAdminHost = () => window.location.hostname === ADMIN_HOST;

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
