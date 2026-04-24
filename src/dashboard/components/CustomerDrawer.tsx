import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MapPin,
  Mail,
  Phone,
  Pin,
  Star,
  UserCircle2,
  X,
} from 'lucide-react';
import type {
  CustomerProject,
  NoteItem,
  ProjectStage,
  TeamMember,
  CustomerPriority,
  SiteStatus,
  QuoteStatus,
  PaymentStage,
} from '../types';
import type { WorkspaceBusinessConfig } from '../businessConfig';
import { formatCurrency, formatDateTime, relativeDate, siteBadgeClass, siteStatusLabels, stageLabels } from '../utils';
import { StatusBadge } from './StatusBadge';
import { ProgressTracker } from './ProgressTracker';

type CustomerDrawerProps = {
  customer: CustomerProject | null;
  team: TeamMember[];
  businessConfig: WorkspaceBusinessConfig;
  open: boolean;
  onClose: () => void;
  onStageChange: (customerId: string, stage: ProjectStage) => void;
  onOwnerChange: (customerId: string, ownerId: string) => void;
  onTogglePinned: (customerId: string) => void;
  onToggleFollowUp: (customerId: string) => void;
  onAddNote: (customerId: string, note: string) => void;
  onRequestArchive: (customerId: string) => void;
  onRequestDelete: (customerId: string) => void;
  onUpdateCustomer?: (customerId: string, payload: Partial<CustomerProject>) => void;
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

const priorityOptions: CustomerPriority[] = ['low', 'medium', 'high'];
const siteStatusOptions: SiteStatus[] = ['under_construction', 'ready', 'in_progress'];
const quoteStatusOptions = ['draft', 'sent', 'approved', 'revised'] as const;
const paymentStageOptions = ['not_started', 'advance_received', 'partial_paid', 'paid'] as const;

// Generic wrapper for friction-free inline editing. Updates local state instantly, but only hits database onBlur.
const InlineInput = ({ 
  value, 
  onSave, 
  placeholder, 
  className, 
  isTextarea = false,
  type = 'text',
}: { 
  value: string; 
  onSave: (val: string) => void; 
  placeholder?: string; 
  className?: string;
  isTextarea?: boolean;
  type?: string;
}) => {
  const [localVal, setLocalVal] = useState(value);
  
  useEffect(() => {
    setLocalVal(value);
  }, [value]);
  
  const handleBlur = () => {
    if (localVal.trim() !== value) {
      onSave(localVal.trim());
    }
  };

  if (isTextarea) {
    return (
      <textarea 
        value={localVal} 
        onChange={e => setLocalVal(e.target.value)} 
        onBlur={handleBlur} 
        placeholder={placeholder} 
        autoComplete="off"
        className={`bg-transparent outline-none border border-transparent hover:border-brand-30 focus:border-brand-10 focus:ring-1 focus:ring-brand-10 transition-colors rounded-lg px-2 py-1 -ml-2 w-full resize-none ${className}`} 
      />
    );
  }
  
  return (
    <input 
      type={type}
      value={localVal} 
      onChange={e => setLocalVal(e.target.value)} 
      onBlur={handleBlur} 
      placeholder={placeholder} 
      autoComplete="off"
      className={`bg-transparent outline-none border border-transparent hover:border-brand-30 focus:border-brand-10 focus:ring-1 focus:ring-brand-10 transition-colors rounded-lg px-2 py-1 -ml-2 w-full ${className} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} 
    />
  );
};

const InlineCurrencyInput = ({ value, onSave, className }: { value: number; onSave: (val: number) => void; className?: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value || 0));

  useEffect(() => {
    if (!isEditing) {
      setLocalVal(String(value || 0));
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = Number(localVal.replace(/[^0-9.-]+/g, ""));
    if (!isNaN(parsed) && parsed !== value) {
      onSave(parsed);
    } else {
      setLocalVal(String(value || 0));
    }
  };

  if (!isEditing) {
    return (
      <div 
        onClick={() => setIsEditing(true)} 
        className={`cursor-text border border-transparent hover:border-brand-30 rounded-lg px-2 py-1 -ml-2 transition-colors inline-block min-w-[4rem] ${className}`}
      >
        {formatCurrency(value || 0)}
      </div>
    );
  }

  return (
    <input 
      type="text"
      autoFocus
      value={localVal} 
      onChange={e => setLocalVal(e.target.value)} 
      onBlur={handleBlur} 
      autoComplete="off"
      className={`bg-white outline-none border border-brand-10 focus:ring-1 focus:ring-brand-10 transition-colors rounded-lg px-2 py-1 -ml-2 w-full ${className}`} 
    />
  );
};

export const CustomerDrawer = ({
  customer,
  team,
  businessConfig,
  open,
  onClose,
  onStageChange,
  onOwnerChange,
  onTogglePinned,
  onToggleFollowUp,
  onAddNote,
  onRequestArchive,
  onRequestDelete,
  onUpdateCustomer,
}: CustomerDrawerProps) => {
  const [draftNote, setDraftNote] = useState('');

  useEffect(() => {
    setDraftNote('');
  }, [customer?.id]);

  if (!customer) return null;

  const latestActivities = customer.activities.slice(0, 3);

  const submitNote = () => {
    if (!draftNote.trim()) return;
    onAddNote(customer.id, draftNote);
    setDraftNote('');
  };

  const handleFieldSave = <K extends keyof CustomerProject>(field: K, value: CustomerProject[K]) => {
    if (onUpdateCustomer) {
      onUpdateCustomer(customer.id, { [field]: value });
    }
  };

  const handleQuoteSave = <K extends keyof CustomerProject['quote']>(
    field: K,
    value: CustomerProject['quote'][K],
  ) => {
    if (onUpdateCustomer) {
      onUpdateCustomer(customer.id, {
        quote: {
          ...customer.quote,
          [field]: value,
        },
      });
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-dark/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] bg-brand-60 shadow-2xl"
          >
            {/* Header Sticky Container */}
            <div className="shrink-0 border-b border-brand-30 bg-brand-60/95 px-6 py-5 backdrop-blur z-20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <InlineInput 
                      value={customer.customerName} 
                      onSave={(val) => handleFieldSave('customerName', val)}
                      className="text-2xl font-semibold tracking-tight text-brand-dark max-w-sm sm:max-w-md font-sans"
                      placeholder="Customer Name"
                    />
                    <StatusBadge stage={customer.stage} labels={businessConfig.stageLabels} />
                    
                    <select
                      value={customer.priority}
                      onChange={(e) => handleFieldSave('priority', e.target.value as CustomerPriority)}
                      className="cursor-pointer appearance-none outline-none border border-brand-30 bg-white hover:bg-brand-30/50 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-dark transition-colors"
                    >
                      {priorityOptions.map(p => (
                        <option key={p} value={p}>{p} priority</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-brand-dark/80">
                    <InlineInput 
                      value={customer.title} 
                      onSave={(val) => handleFieldSave('title', val)}
                      className="w-48 text-sm"
                      placeholder="Project Title"
                    />
                    <span>• Updated {relativeDate(customer.lastUpdated)}</span>
                  </div>
                </div>
                <button onClick={onClose} className="shrink-0 rounded-2xl border border-brand-30 bg-white p-2.5 text-brand-dark/60 hover:text-brand-dark transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              
              {/* Top Meta Section */}
              <section className="rounded-[28px] border border-brand-30 bg-white p-6">
                <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={customer.siteStatus}
                        onChange={(e) => handleFieldSave('siteStatus', e.target.value as SiteStatus)}
                        className={`${siteBadgeClass(customer.siteStatus)} cursor-pointer appearance-none font-sans`}
                      >
                        {siteStatusOptions.map(p => (
                          <option key={p} value={p}>{businessConfig.siteStatusLabels[p] || siteStatusLabels[p]}</option>
                        ))}
                      </select>
                      
                      <button 
                        onClick={() => handleFieldSave('needsFollowUp', !customer.needsFollowUp)} 
                        className={`rounded-full px-3 py-1 text-xs font-semibold text-brand-dark transition-colors ${customer.needsFollowUp ? 'bg-amber-100/70 text-amber-800 border border-amber-200' : 'bg-brand-30/50 border border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        Needs follow-up
                      </button>

                      <button 
                        onClick={() => handleFieldSave('renderPending', !customer.renderPending)} 
                        className={`rounded-full px-3 py-1 text-xs font-semibold text-brand-dark transition-colors ${customer.renderPending ? 'bg-sky-100/70 text-sky-800 border border-sky-200' : 'bg-brand-30/50 border border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        Render pending
                      </button>
                    </div>
                    <div className="mt-6">
                      <ProgressTracker stage={customer.stage} progress={customer.progress} compact labels={businessConfig.stageLabels} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onTogglePinned(customer.id)} className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${customer.pinned ? 'bg-brand-10 text-white border-brand-10' : 'border-brand-30 text-brand-dark'}`}>
                      <Pin size={16} className={customer.pinned ? "fill-current" : ""} />
                      {customer.pinned ? 'Pinned' : 'Pin'}
                    </button>
                    <button onClick={() => onToggleFollowUp(customer.id)} className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${customer.needsFollowUp ? 'bg-brand-10 text-white border-brand-10' : 'border-brand-30 text-brand-dark'}`}>
                      <Star size={16} className={customer.needsFollowUp ? "fill-current" : ""} />
                      {customer.needsFollowUp ? 'Starred' : 'Follow-up'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl bg-brand-60/50 p-5 space-y-4 text-sm text-brand-dark">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                      <span className="font-semibold text-brand-dark/70">Owner</span>
                      <select
                        value={customer.ownerId || ''}
                        onChange={(event) => onOwnerChange(customer.id, event.target.value)}
                        className="rounded-xl border border-transparent hover:border-brand-30 bg-transparent focus:bg-white px-2 py-1 outline-none font-medium"
                      >
                        <option value="">Unassigned</option>
                        {team.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                      <span className="font-semibold text-brand-dark/70">Lead designer</span>
                      <select
                        value={customer.leadDesignerId || ''}
                        onChange={(event) => handleFieldSave('leadDesignerId', event.target.value)}
                        className="rounded-xl border border-transparent hover:border-brand-30 bg-transparent focus:bg-white px-2 py-1 outline-none font-medium"
                      >
                        <option value="">Unassigned</option>
                        {team.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                      <span className="font-semibold text-brand-dark/70">Field staff</span>
                      <select
                        value={customer.fieldStaffId || ''}
                        onChange={(event) => handleFieldSave('fieldStaffId', event.target.value)}
                        className="rounded-xl border border-transparent hover:border-brand-30 bg-transparent focus:bg-white px-2 py-1 outline-none font-medium"
                      >
                        <option value="">Unassigned</option>
                        {team.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-brand-60/50 p-5 space-y-4 text-sm text-brand-dark">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                      <span className="font-semibold text-brand-dark/70">Start Date</span>
                      <InlineInput 
                        type="date"
                        value={customer.startDate.split('T')[0] || ''} 
                        onSave={(val) => handleFieldSave('startDate', new Date(val).toISOString())}
                        className="font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                      <span className="font-semibold text-brand-dark/70">Target Date</span>
                      <InlineInput 
                        type="date"
                        value={customer.targetDate.split('T')[0] || ''} 
                        onSave={(val) => handleFieldSave('targetDate', new Date(val).toISOString())}
                        className="font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                      <span className="font-semibold text-brand-dark/70">Next follow-up</span>
                      <InlineInput 
                        type="datetime-local"
                        value={customer.nextFollowUpAt ? customer.nextFollowUpAt.slice(0, 16) : ''} 
                        onSave={(val) => handleFieldSave('nextFollowUpAt', new Date(val).toISOString())}
                        className="font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-brand-30 pt-6">
                  <label className="flex items-center gap-3 text-sm font-semibold text-brand-dark">
                    <span>Current stage:</span>
                    <select
                      value={customer.stage}
                      onChange={(event) => onStageChange(customer.id, event.target.value as ProjectStage)}
                      className="rounded-xl border border-brand-30 bg-white px-3 py-1.5 font-medium text-brand-10 outline-none hover:border-brand-10 transition-colors"
                    >
                      {stageOptions.map((stage) => (
                        <option key={stage} value={stage}>
                          {businessConfig.stageLabels[stage] || stageLabels[stage]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {/* Data Section Grid */}
              <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                
                {/* Contact Profiles */}
                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-tight text-brand-dark">Contact Information</h3>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="pt-2 text-brand-10/70"><Phone size={18} /></div>
                      <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 mb-0.5">Primary Phone</div>
                        <InlineInput 
                          value={customer.phone} 
                          onSave={(val) => handleFieldSave('phone', val)}
                          placeholder="Add phone number"
                          className="font-medium text-[15px]"
                        />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="pt-2 text-brand-10/70"><Mail size={18} /></div>
                      <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 mb-0.5">Email Address</div>
                        <InlineInput 
                          value={customer.email} 
                          onSave={(val) => handleFieldSave('email', val)}
                          placeholder="Add email address"
                           className="font-medium text-[15px]"
                        />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="pt-2 text-brand-10/70"><MapPin size={18} /></div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 mb-0.5">Physical Address</div>
                          <InlineInput 
                            value={customer.address} 
                            onSave={(val) => handleFieldSave('address', val)}
                            placeholder="Add precise address"
                            className="font-medium text-[15px]"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/50 mb-0.5">General Location / City</div>
                          <InlineInput 
                            value={customer.location} 
                            onSave={(val) => handleFieldSave('location', val)}
                            placeholder="Add city or region"
                            className="font-medium text-[15px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-tight text-brand-dark">Permanent Notes</h3>
                  <div className="mt-4">
                    <InlineInput 
                      isTextarea
                      value={customer.notes} 
                      onSave={(val) => handleFieldSave('notes', val)}
                      placeholder="Add overarching project notes here. This is persistent unlike the activity log."
                      className="min-h-[160px] text-[15px] leading-relaxed text-brand-dark/90"
                    />
                  </div>
                </section>

              </div>

              {/* Advanced Grids */}
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-tight text-brand-dark">Latest activity</h3>
                  <div className="mt-4 space-y-4">
                    {latestActivities.length ? latestActivities.map((activity) => (
                      <div key={activity.id} className="flex gap-4">
                        <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-brand-10 shrink-0" />
                        <div>
                          <div className="font-semibold text-[15px] text-brand-dark">{activity.title}</div>
                          <div className="mt-0.5 text-sm leading-relaxed text-brand-dark/80">{activity.description}</div>
                          <div className="mt-1.5 text-xs font-medium text-brand-dark/50">
                            {activity.actorName} • {formatDateTime(activity.createdAt)}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-sm text-brand-dark/50 italic border border-dashed border-brand-30 rounded-2xl p-4">No activities logged yet.</div>
                    )}
                  </div>
                </section>

                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-tight text-brand-dark">Quote summary</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] bg-brand-60/50 p-4 border border-brand-30/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 mb-1">Estimated value</div>
                      <InlineCurrencyInput 
                        value={customer.quote.estimatedValue || 0} 
                        onSave={(val) => handleQuoteSave('estimatedValue', val)}
                        className="text-xl font-semibold tracking-tight text-brand-dark"
                      />
                    </div>
                    <div className="rounded-[20px] bg-brand-60/50 p-4 border border-brand-30/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 mb-1">Quote amount</div>
                      <InlineCurrencyInput 
                         value={customer.quote.quoteValue || 0} 
                         onSave={(val) => handleQuoteSave('quoteValue', val)}
                         className="text-xl font-semibold tracking-tight text-brand-10"
                      />
                    </div>
                    <div className="rounded-[20px] bg-brand-60/50 p-4 border border-brand-30/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/60">Quote status</div>
                      <select
                        value={customer.quote.quoteStatus}
                        onChange={(e) => handleQuoteSave('quoteStatus', e.target.value as QuoteStatus)}
                        className="mt-1 w-full bg-transparent text-[15px] cursor-pointer appearance-none font-semibold capitalize text-brand-dark outline-none border border-transparent hover:border-brand-30 rounded-lg -ml-2 px-2 py-1"
                      >
                        {quoteStatusOptions.map(p => (
                          <option key={p} value={p}>{p.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-[20px] bg-brand-60/50 p-4 border border-brand-30/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/60">Payment stage</div>
                      <select
                        value={customer.quote.paymentStage}
                        onChange={(e) => handleQuoteSave('paymentStage', e.target.value as PaymentStage)}
                        className="mt-1 w-full bg-transparent text-[15px] cursor-pointer appearance-none font-semibold capitalize text-brand-dark outline-none border border-transparent hover:border-brand-30 rounded-lg -ml-2 px-2 py-1"
                      >
                        {paymentStageOptions.map(p => (
                          <option key={p} value={p}>{p.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-[20px] bg-brand-60/50 p-4 border border-brand-30/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 mb-1">Advance Received</div>
                      <InlineCurrencyInput 
                         value={customer.quote.advanceReceived || 0} 
                         onSave={(val) => handleQuoteSave('advanceReceived', val)}
                         className="text-xl font-semibold tracking-tight text-brand-dark"
                      />
                    </div>
                    <div className="rounded-[20px] bg-brand-60/50 p-4 border border-brand-30/50">
                      <div className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 mb-1">Partially Paid Amount</div>
                      <InlineCurrencyInput 
                         value={customer.quote.partiallyPaidAmount || 0} 
                         onSave={(val) => handleQuoteSave('partiallyPaidAmount', val)}
                         className="text-xl font-semibold tracking-tight text-brand-dark"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <section className="rounded-[28px] border border-brand-30 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-tight text-brand-dark">Internal notes</h3>
                  <div className="mt-5 space-y-4">
                    {customer.internalNotes.slice(0, 3).map((note: NoteItem) => (
                      <div key={note.id} className="rounded-2xl border border-brand-30 bg-brand-60/30 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
                          <UserCircle2 size={16} className="text-brand-10" />
                          {note.authorName}
                        </div>
                        <p className="mt-2 text-[15px] leading-relaxed text-brand-dark/80">{note.content}</p>
                        <div className="mt-2 text-xs font-medium text-brand-dark/40">{formatDateTime(note.createdAt)}</div>
                      </div>
                    ))}

                    <div className="rounded-2xl border border-brand-10/20 bg-brand-10/5 p-4 mt-6">
                      <textarea
                        value={draftNote}
                        onChange={(event) => setDraftNote(event.target.value)}
                        placeholder="Add a quick internal note..."
                        className="min-h-[100px] w-full resize-none bg-transparent text-[15px] text-brand-dark outline-none placeholder:text-brand-dark/40"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-brand-10/10 pt-3">
                        <button onClick={submitNote} disabled={!draftNote.trim()} className="rounded-xl bg-brand-10 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50">
                          Save Update
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Danger Zone Bottom Actions */}
                <div className="flex flex-col gap-3 justify-end h-full mt-auto py-10 opacity-70 hover:opacity-100 transition-opacity">
                   <h4 className="text-sm font-bold text-rose-800/60 uppercase tracking-widest pl-2 mb-2">Danger Zone</h4>
                   <button onClick={() => onRequestArchive(customer.id)} className="w-full rounded-2xl border-2 border-brand-30 bg-white px-4 py-4 text-[15px] font-semibold text-brand-dark hover:border-brand-dark transition-colors text-left">
                      Archive Workspace
                   </button>
                   <button onClick={() => onRequestDelete(customer.id)} className="w-full rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-4 text-[15px] font-semibold text-rose-700 hover:border-rose-400 hover:bg-rose-100 transition-colors text-left">
                      Permanently Delete Record
                   </button>
                </div>

              </div>

            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
