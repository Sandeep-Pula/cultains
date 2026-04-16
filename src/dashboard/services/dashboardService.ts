import { mockDashboardData } from '../data/mockDashboard';
import type { DashboardData } from '../types';

const cloneData = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const dashboardService = {
  async fetchDashboardData(): Promise<DashboardData> {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return cloneData(mockDashboardData);
  },
};
