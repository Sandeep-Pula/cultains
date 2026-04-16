import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeIndianRupee,
  MessageSquareQuote,
  MapPin,
  Mail,
  Phone,
  Pin,
  Star,
  UserCircle2,
  X,
} from 'lucide-react';
import type { CustomerProject, NoteItem, ProjectStage, TeamMember } from '../types';
import { formatCurrency, formatDate, formatDateTime, relativeDate, siteBadgeClass, siteStatusLabels, stageLabels } from '../utils';
import { StatusBadge } from './StatusBadge';
import { ProgressTracker } from './ProgressTracker';

type CustomerDrawerProps = {
  customer: CustomerProject | null;
  team: TeamMember[];
  open: boolean;
  onClose: () => void;
  onStageChange: (customerId: string, stage: ProjectStage) => void;
  onOwnerChange: (customerId: string, ownerId: string) => void;
  onTogglePinned: (customerId: string) => void;
  onToggleFollowUp: (customerId: string) => void;
  onAddNote: (customerId: string, note: string) => void;
  onRequestArchive: (customerId: string) => void;
  onRequestDelete: (customerId: string) => void;
  onReassignTeam: (customerId: string, teamIds: string[]) => void;
};

const stageOptions: ProjectStage[] = [
  'inquiry',
  'consultation',
  'design_in_progress',
  'render_shared',
  'customer_approved',
  'execution_started',
  'completed',
  'on_hold',
];

const getMember = (team: TeamMember[], id: string) => team.find((member) => member.id === id);

export const CustomerDrawer = ({
  customer,
  team,
  open,
  onClose,
  onStageChange,
  onOwnerChange,
  onTogglePinned,
  onToggleFollowUp,
  onAddNote,
  onRequestArchive,
  onRequestDelete,
  onReassignTeam,
}: CustomerDrawerProps) => {
  const [draftNote, setDraftNote] = useState('');

  useEffect(() => {
    setDraftNote('');
  }, [customer?.id]);

  if (!customer) return null;

  const owner = getMember(team, customer.ownerId);
  const leadDesigner = getMember(team, customer.leadDesignerId);
  const fieldStaff = getMember(team, customer.fieldStaffId);

  const submitNote = () => {
    if (!draftNote.trim()) return;
    onAddNote(customer.id, draftNote);
    setDraftNote('');
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-[#1f1711]/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            className="fixed right-0 top-0 z-[100] h-full w-full max-w-3xl overflow-y-auto border-l border-[#eadfd2] bg-[#fcf8f2] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#eadfd2] bg-[#fcf8f2]/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-[#201812]">{customer.customerName}</h2>
                  <StatusBadge stage={customer.stage} />
                  {customer.priority === 'high' ? (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                      High priority
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#6f604f]">
                  {customer.title} • Updated {relativeDate(customer.lastUpdated)}
                </p>
              </div>
              <button onClick={onClose} className="rounded-2xl border border-[#eadfd2] bg-white p-2 text-[#6f5438]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 px-5 py-5">
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-3xl border border-[#eadfd2] bg-white p-5">
                  <h3 className="text-lg font-semibold text-[#201812]">Customer profile</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#faf4eb] p-4">
                      <div className="flex items-center gap-2 text-sm text-[#6f604f]"><Phone size={16} /> {customer.phone}</div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-[#6f604f]"><Mail size={16} /> {customer.email}</div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-[#6f604f]"><MapPin size={16} /> {customer.address}</div>
                    </div>
                    <div className="rounded-2xl bg-[#faf4eb] p-4 text-sm leading-6 text-[#6f604f]">
                      <div><span className="font-semibold text-[#201812]">Location:</span> {customer.location}</div>
                      <div className="mt-2"><span className="font-semibold text-[#201812]">Notes:</span> {customer.notes}</div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-[#eadfd2] bg-white p-5">
                  <h3 className="text-lg font-semibold text-[#201812]">Project health</h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={siteBadgeClass(customer.siteStatus)}>{siteStatusLabels[customer.siteStatus]}</span>
                      {customer.needsFollowUp ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Needs follow-up</span>
                      ) : null}
                      {customer.renderPending ? (
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">Render pending</span>
                      ) : null}
                    </div>
                    <ProgressTracker stage={customer.stage} progress={customer.progress} compact />
                    <div className="grid gap-3 text-sm text-[#6f604f] md:grid-cols-2">
                      <div><span className="font-semibold text-[#201812]">Start date:</span> {formatDate(customer.startDate)}</div>
                      <div><span className="font-semibold text-[#201812]">Target date:</span> {formatDate(customer.targetDate)}</div>
                      <div><span className="font-semibold text-[#201812]">Next follow-up:</span> {formatDateTime(customer.nextFollowUpAt)}</div>
                      <div><span className="font-semibold text-[#201812]">Deal probability:</span> {customer.dealProbability}%</div>
                    </div>
                  </div>
                </section>
              </div>

              <section className="rounded-3xl border border-[#eadfd2] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[#201812]">Project workflow</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => onTogglePinned(customer.id)} className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfd2] px-3 py-2 text-sm text-[#6f604f]">
                      <Pin size={16} />
                      {customer.pinned ? 'Unpin' : 'Pin project'}
                    </button>
                    <button onClick={() => onToggleFollowUp(customer.id)} className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfd2] px-3 py-2 text-sm text-[#6f604f]">
                      <Star size={16} />
                      {customer.needsFollowUp ? 'Clear follow-up' : 'Mark follow-up'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm text-[#6f604f]">
                    <span className="font-medium text-[#201812]">Current stage</span>
                    <select
                      value={customer.stage}
                      onChange={(event) => onStageChange(customer.id, event.target.value as ProjectStage)}
                      className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2"
                    >
                      {stageOptions.map((stage) => (
                        <option key={stage} value={stage}>
                          {stageLabels[stage]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm text-[#6f604f]">
                    <span className="font-medium text-[#201812]">Project owner</span>
                    <select
                      value={customer.ownerId}
                      onChange={(event) => onOwnerChange(customer.id, event.target.value)}
                      className="rounded-2xl border border-[#eadfd2] bg-[#fcf8f2] px-3 py-2"
                    >
                      {team.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-[#eadfd2] bg-white p-5">
                <h3 className="text-lg font-semibold text-[#201812]">Team assignment</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    { label: 'Owner', member: owner },
                    { label: 'Lead designer', member: leadDesigner },
                    { label: 'Field staff', member: fieldStaff },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-[#faf4eb] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#9b8570]">{item.label}</div>
                      {item.member ? (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2e7d8] font-semibold text-[#6f5438]">
                            {item.member.avatar}
                          </div>
                          <div>
                            <div className="font-medium text-[#201812]">{item.member.name}</div>
                            <div className="text-sm text-[#6f604f]">{item.member.role}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-[#6f604f]">Not assigned</div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-[#faf4eb] p-4">
                  <div className="text-sm font-medium text-[#201812]">Assign additional team members</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {team.map((member) => {
                      const selected = customer.assignedTeamIds.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          onClick={() =>
                            onReassignTeam(
                              customer.id,
                              selected
                                ? customer.assignedTeamIds.filter((id) => id !== member.id)
                                : [...customer.assignedTeamIds, member.id],
                            )
                          }
                          className={`rounded-full px-3 py-1.5 text-sm ${selected ? 'bg-[#6f5438] text-white' : 'bg-white text-[#6f604f]'}`}
                        >
                          {member.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#eadfd2] bg-white p-5">
                <h3 className="text-lg font-semibold text-[#201812]">Render history</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {customer.renders.map((render) => (
                    <div key={render.id} className="overflow-hidden rounded-3xl border border-[#eadfd2] bg-[#faf4eb]">
                      <img src={render.imageUrl} alt={render.name} className="h-44 w-full object-cover" />
                      <div className="space-y-2 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-[#201812]">{render.name}</div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#6f604f]">{render.version}</span>
                        </div>
                        <div className="text-sm text-[#6f604f]">
                          {render.type} • {formatDateTime(render.createdAt)}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {render.wallpaperCode ? <span className="rounded-full bg-white px-2 py-1 text-[#6f604f]">{render.wallpaperCode}</span> : null}
                          {render.curtainCode ? <span className="rounded-full bg-white px-2 py-1 text-[#6f604f]">{render.curtainCode}</span> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-3xl border border-[#eadfd2] bg-white p-5">
                  <h3 className="text-lg font-semibold text-[#201812]">Activity timeline</h3>
                  <div className="mt-4 space-y-4">
                    {customer.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#6f5438]" />
                        <div>
                          <div className="font-medium text-[#201812]">{activity.title}</div>
                          <div className="text-sm text-[#6f604f]">{activity.description}</div>
                          <div className="mt-1 text-xs text-[#9b8570]">
                            {activity.actorName} • {formatDateTime(activity.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-[#eadfd2] bg-white p-5">
                  <div className="flex items-center gap-2">
                    <BadgeIndianRupee size={18} className="text-[#6f5438]" />
                    <h3 className="text-lg font-semibold text-[#201812]">Quote & payment</h3>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#faf4eb] p-4">
                      <div className="text-sm text-[#6f604f]">Estimated value</div>
                      <div className="mt-2 text-xl font-semibold text-[#201812]">{formatCurrency(customer.quote.estimatedValue)}</div>
                    </div>
                    <div className="rounded-2xl bg-[#faf4eb] p-4">
                      <div className="text-sm text-[#6f604f]">Quote amount</div>
                      <div className="mt-2 text-xl font-semibold text-[#201812]">{formatCurrency(customer.quote.quoteValue)}</div>
                    </div>
                    <div className="rounded-2xl bg-[#faf4eb] p-4">
                      <div className="text-sm text-[#6f604f]">Quote status</div>
                      <div className="mt-2 text-sm font-medium capitalize text-[#201812]">{customer.quote.quoteStatus.replace('_', ' ')}</div>
                    </div>
                    <div className="rounded-2xl bg-[#faf4eb] p-4">
                      <div className="text-sm text-[#6f604f]">Payment stage</div>
                      <div className="mt-2 text-sm font-medium capitalize text-[#201812]">{customer.quote.paymentStage.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <MessageSquareQuote size={18} className="text-[#6f5438]" />
                    <h3 className="text-lg font-semibold text-[#201812]">Sales + CRM timeline</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {customer.communicationLog.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-[#faf4eb] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium capitalize text-[#201812]">{item.type.replace('_', ' ')}</div>
                          <div className="text-xs text-[#9b8570]">{formatDateTime(item.createdAt)}</div>
                        </div>
                        <div className="mt-2 text-sm text-[#6f604f]">{item.summary}</div>
                        <div className="mt-2 text-sm text-[#201812]">{item.outcome}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-[#eadfd2] bg-white p-5">
                  <h3 className="text-lg font-semibold text-[#201812]">Internal notes</h3>
                  <div className="mt-4 space-y-3">
                    {customer.internalNotes.map((note: NoteItem) => (
                      <div key={note.id} className="rounded-2xl bg-[#faf4eb] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-[#201812]">
                          <UserCircle2 size={16} />
                          {note.authorName}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#6f604f]">{note.content}</p>
                        <div className="mt-2 text-xs text-[#9b8570]">{formatDateTime(note.createdAt)}</div>
                      </div>
                    ))}
                    <div className="rounded-2xl border border-dashed border-[#eadfd2] p-4">
                      <textarea
                        value={draftNote}
                        onChange={(event) => setDraftNote(event.target.value)}
                        placeholder="Add an internal note or handoff comment..."
                        className="min-h-24 w-full resize-none bg-transparent text-sm text-[#201812] outline-none placeholder:text-[#b6a08c]"
                      />
                      <div className="mt-3 flex justify-between gap-3">
                        <button onClick={() => onRequestArchive(customer.id)} className="rounded-2xl border border-rose-200 px-3 py-2 text-sm text-rose-700">
                          Archive project
                        </button>
                        <div className="flex gap-3">
                          <button onClick={() => onRequestDelete(customer.id)} className="rounded-2xl border border-rose-300 px-3 py-2 text-sm text-rose-700">
                            Delete customer
                          </button>
                          <button onClick={submitNote} className="rounded-2xl bg-[#6f5438] px-4 py-2 text-sm font-medium text-white">
                            Save note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};
