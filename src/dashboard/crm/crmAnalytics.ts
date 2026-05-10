import type { CrmData, CrmDeal, CrmTask } from './types';

const isSameDay = (value: string, date = new Date()) => {
  const next = new Date(value);
  return next.getFullYear() === date.getFullYear() && next.getMonth() === date.getMonth() && next.getDate() === date.getDate();
};

const isThisMonth = (value: string, date = new Date()) => {
  const next = new Date(value);
  return next.getFullYear() === date.getFullYear() && next.getMonth() === date.getMonth();
};

const isOverdue = (task: CrmTask) => task.status !== 'completed' && new Date(task.dueAt).getTime() < Date.now();
const openDeals = (deals: CrmDeal[]) => deals.filter((deal) => deal.status === 'open');

export const buildCrmAnalytics = (data: CrmData) => {
  const leadsThisMonth = data.leads.filter((lead) => isThisMonth(lead.createdAt)).length;
  const todayTasks = data.tasks.filter((task) => task.status !== 'completed' && isSameDay(task.dueAt));
  const overdueTasks = data.tasks.filter(isOverdue);
  const pipelineValue = openDeals(data.deals).reduce((sum, deal) => sum + deal.value, 0);
  const forecastValue = openDeals(data.deals).reduce((sum, deal) => sum + deal.value * (deal.probability / 100), 0);
  const likelyToClose = openDeals(data.deals)
    .filter((deal) => deal.probability >= 70)
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 8);
  const staleContacts = data.contacts
    .filter((contact) => {
      const last = contact.lastActivityAt || contact.updatedAt || contact.createdAt;
      return Date.now() - new Date(last).getTime() > 30 * 24 * 60 * 60 * 1000;
    })
    .slice(0, 8);
  const pendingTasksByOwner = data.tasks
    .filter((task) => task.status !== 'completed')
    .reduce<Record<string, number>>((map, task) => {
      map[task.assignedTo || 'unassigned'] = (map[task.assignedTo || 'unassigned'] ?? 0) + 1;
      return map;
    }, {});

  return {
    totalContacts: data.contacts.length,
    leadsThisMonth,
    newLeads: data.leads.filter((lead) => lead.status === 'new').length,
    openDeals: openDeals(data.deals).length,
    followUpsDueToday: todayTasks.length,
    pendingTasks: data.tasks.filter((task) => task.status !== 'completed').length,
    overdueTasks: overdueTasks.length,
    pipelineValue,
    forecastValue,
    wonDeals: data.deals.filter((deal) => deal.status === 'won').length,
    lostDeals: data.deals.filter((deal) => deal.status === 'lost').length,
    likelyToClose,
    staleContacts,
    pendingTasksByOwner,
    sourcePerformance: data.settings.leadSources.map((source) => ({
      source,
      leads: data.leads.filter((lead) => lead.source === source).length,
      contacts: data.contacts.filter((contact) => contact.source === source).length,
      converted: data.leads.filter((lead) => lead.source === source && lead.status === 'converted').length,
    })),
    stageSummary: data.pipelines.flatMap((pipeline) =>
      pipeline.stages.map((stage) => ({
        pipelineId: pipeline.id,
        pipeline: pipeline.name,
        stageId: stage.id,
        stage: stage.name,
        deals: data.deals.filter((deal) => deal.pipelineId === pipeline.id && deal.stageId === stage.id).length,
        value: data.deals
          .filter((deal) => deal.pipelineId === pipeline.id && deal.stageId === stage.id)
          .reduce((sum, deal) => sum + deal.value, 0),
      })),
    ),
  };
};

export type CrmAnalytics = ReturnType<typeof buildCrmAnalytics>;
