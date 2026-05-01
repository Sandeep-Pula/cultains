import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const OUT_DIR = '/Users/sandeeppula/Desktop/cultains/outputs/pulalabs_pitch_deck';
const SCRATCH_DIR = '/Users/sandeeppula/Desktop/cultains/tmp/slides/pulalabs_pitch_deck';
const LOGO = '/Users/sandeeppula/Desktop/cultains/public/pulalabs-logo.png';
const PPTX = path.join(OUT_DIR, 'Pula Labs_StartupIndia_PitchDeck.pptx');

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(SCRATCH_DIR, { recursive: true });

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

const W = 1280;
const H = 720;
const C = {
  bg: '#F8F5EE',
  paper: '#FFFDF8',
  ink: '#18212A',
  muted: '#5C6872',
  line: '#D8D1C3',
  teal: '#007C78',
  teal2: '#0DA6A0',
  green: '#2D8A57',
  saffron: '#F2A12B',
  coral: '#E56B55',
  navy: '#102A43',
  paleTeal: '#DFF4F0',
  paleSaffron: '#FFF1D6',
};

const deck = Presentation.create({ slideSize: { width: W, height: H } });
deck.theme.colorScheme = {
  name: 'Pula Labs',
  themeColors: {
    accent1: C.teal,
    accent2: C.saffron,
    accent3: C.green,
    accent4: C.coral,
    bg1: C.bg,
    bg2: C.paper,
    tx1: C.ink,
    tx2: C.muted,
  },
};

function addShape(slide, geometry, position, fill = C.paper, line = { style: 'solid', fill: C.line, width: 1 }) {
  const shape = slide.shapes.add({ geometry, position, fill, line });
  return shape;
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const box = addShape(slide, 'rect', { left: x, top: y, width: w, height: h }, opts.fill ?? '#FFFFFF00', opts.line ?? { width: 0, fill: '#FFFFFF00' });
  box.text = Array.isArray(text) ? text : String(text);
  box.text.typeface = opts.typeface ?? 'Lato';
  box.text.fontSize = opts.size ?? 24;
  box.text.color = opts.color ?? C.ink;
  box.text.bold = Boolean(opts.bold);
  box.text.alignment = opts.align ?? 'left';
  box.text.verticalAlignment = opts.valign ?? 'top';
  box.text.insets = opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 };
  if (opts.autoFit) box.text.autoFit = opts.autoFit;
  return box;
}

async function addLogo(slide, x = 54, y = 46, size = 52) {
  const image = slide.images.add({ blob: await readImageBlob(LOGO), fit: 'contain', alt: 'Pula Labs logo' });
  image.position = { left: x, top: y, width: size, height: size };
  return image;
}

function addHeader(slide, eyebrow, title, subtitle) {
  slide.background.fill = C.bg;
  addText(slide, eyebrow.toUpperCase(), 64, 44, 520, 28, { size: 13, bold: true, color: C.teal, typeface: 'Poppins' });
  addText(slide, title, 64, 76, 760, 92, { size: 38, bold: true, typeface: 'Poppins', color: C.ink, autoFit: 'shrinkText' });
  if (subtitle) addText(slide, subtitle, 64, 166, 760, 48, { size: 18, color: C.muted, autoFit: 'shrinkText' });
  addShape(slide, 'rect', { left: 64, top: 222, width: 86, height: 4 }, C.saffron, { width: 0, fill: C.saffron });
}

function pill(slide, text, x, y, w, color = C.teal, bg = C.paleTeal) {
  const p = addShape(slide, 'roundRect', { left: x, top: y, width: w, height: 34 }, bg, { width: 0, fill: bg });
  p.text = text;
  p.text.typeface = 'Lato';
  p.text.fontSize = 14;
  p.text.bold = true;
  p.text.color = color;
  p.text.alignment = 'center';
  p.text.verticalAlignment = 'middle';
  p.text.insets = { left: 12, right: 12, top: 3, bottom: 3 };
  return p;
}

function card(slide, x, y, w, h, title, body, accent = C.teal) {
  addShape(slide, 'roundRect', { left: x, top: y, width: w, height: h }, C.paper, { style: 'solid', fill: C.line, width: 1.2 });
  addShape(slide, 'rect', { left: x, top: y, width: 7, height: h }, accent, { width: 0, fill: accent });
  addText(slide, title, x + 24, y + 22, w - 42, 34, { size: 20, bold: true, typeface: 'Poppins', autoFit: 'shrinkText' });
  addText(slide, body, x + 24, y + 66, w - 42, h - 82, { size: 15.5, color: C.muted, autoFit: 'shrinkText' });
}

function metric(slide, x, y, label, value, note, accent = C.teal) {
  addShape(slide, 'roundRect', { left: x, top: y, width: 236, height: 118 }, C.paper, { style: 'solid', fill: C.line, width: 1 });
  addText(slide, value, x + 18, y + 18, 196, 38, { size: 30, bold: true, typeface: 'Poppins', color: accent, autoFit: 'shrinkText' });
  addText(slide, label, x + 18, y + 58, 196, 24, { size: 16, bold: true, typeface: 'Poppins' });
  addText(slide, note, x + 18, y + 86, 196, 22, { size: 12.5, color: C.muted, autoFit: 'shrinkText' });
}

function addTable(slide, values, x, y, w, h, widths = []) {
  const table = slide.tables.add(values);
  table.position = { left: x, top: y, width: w, height: h };
  return table;
}

async function slide1() {
  const s = deck.slides.add();
  s.background.fill = C.bg;
  addShape(s, 'rect', { left: 0, top: 0, width: W, height: H }, C.bg, { width: 0, fill: C.bg });
  addShape(s, 'roundRect', { left: 760, top: 0, width: 520, height: 720 }, C.navy, { width: 0, fill: C.navy });
  addShape(s, 'ellipse', { left: 870, top: 110, width: 330, height: 330 }, '#0DA6A026', { width: 0, fill: '#0DA6A026' });
  addShape(s, 'ellipse', { left: 980, top: 340, width: 210, height: 210 }, '#F2A12B2B', { width: 0, fill: '#F2A12B2B' });
  await addLogo(s, 74, 62, 68);
  addText(s, 'Pula Labs', 154, 70, 360, 42, { size: 32, bold: true, typeface: 'Poppins' });
  pill(s, 'Startup India pitch deck', 74, 166, 210, C.teal, C.paleTeal);
  addText(s, 'One adaptive workspace for running Indian businesses with clarity.', 74, 220, 670, 146, { size: 48, bold: true, typeface: 'Poppins', autoFit: 'shrinkText' });
  addText(s, 'CRM, billing, inventory, teams, operations, reporting, and optional AI tools in one branded workspace for owners and teams.', 78, 386, 640, 70, { size: 20, color: C.muted, autoFit: 'shrinkText' });
  addText(s, 'URL: pulalabs.com\nCity: [Add city]\nEmail: [Add email]\nMobile: [Add mobile]', 78, 574, 450, 96, { size: 16, color: C.muted });
  addShape(s, 'roundRect', { left: 840, top: 164, width: 330, height: 390 }, '#FFFFFF14', { style: 'solid', fill: '#FFFFFF42', width: 1 });
  addText(s, 'Owner dashboard', 874, 200, 250, 30, { size: 20, bold: true, typeface: 'Poppins', color: '#FFFFFF' });
  [['Pending follow-ups', '18'], ['Payments due', '₹2.4L'], ['Stock watch', '06']].forEach((m, i) => {
    addShape(s, 'roundRect', { left: 874, top: 260 + i * 78, width: 260, height: 56 }, '#FFFFFF22', { width: 0, fill: '#FFFFFF22' });
    addText(s, m[1], 894, 272 + i * 78, 72, 26, { size: 22, bold: true, typeface: 'Poppins', color: C.saffron });
    addText(s, m[0], 976, 278 + i * 78, 140, 20, { size: 14, bold: true, color: '#FFFFFF' });
  });
  addText(s, 'Investor deck | May 2026', 874, 492, 230, 24, { size: 14, color: '#FFFFFFBB' });
}

async function slide2() {
  const s = deck.slides.add();
  addHeader(s, '02 Team', 'Founder-led operating system for SME workflows', 'Replace the placeholders below with founder names, roles, and current or planned equity.');
  const roles = [
    ['Founder / CEO', 'Owns vision, customer discovery, partnerships, fundraising', '[Name] | [Equity %]'],
    ['Product & Engineering', 'Builds dashboard, auth, Firebase sync, adaptive modules', '[Name] | [Equity %]'],
    ['Sales & Customer Success', 'Converts early businesses, onboarding, training support', '[Name] | [Equity %]'],
    ['Operations / Domain Expert', 'Maps local business workflows into usable product defaults', '[Name] | [Equity %]'],
  ];
  roles.forEach((r, i) => card(s, 68 + (i % 2) * 570, 268 + Math.floor(i / 2) * 150, 520, 118, r[0], `${r[1]}\n${r[2]}`, [C.teal, C.saffron, C.green, C.coral][i]));
  addText(s, 'Guideline fit: state what each person does, why they are suited, whether co-founder/founding member/employee, and their equity.', 72, 626, 1060, 34, { size: 14, color: C.muted, autoFit: 'shrinkText' });
}

function slide3() {
  const s = deck.slides.add();
  addHeader(s, '03 Pain point', 'Growing businesses run on scattered tools and delayed visibility', 'The owner pays the cost in missed follow-ups, unclear cash position, poor stock control, and team confusion.');
  const items = [
    ['Manual follow-ups', 'Leads, repeat customers, and pending approvals live across notebooks, WhatsApp, and memory.'],
    ['Billing blind spots', 'Invoices, dues, collections, vendor payouts, and operating expenses are hard to see together.'],
    ['Inventory pressure', 'Owners learn about low stock too late, especially across sizes, suppliers, branches, or projects.'],
    ['Generic software', 'Most systems force every business into the same labels and workflows, which slows adoption.'],
  ];
  items.forEach((it, i) => card(s, 72 + i * 292, 274, 250, 238, it[0], it[1], [C.coral, C.saffron, C.green, C.teal][i]));
  addShape(s, 'roundRect', { left: 184, top: 560, width: 912, height: 72 }, C.navy, { width: 0, fill: C.navy });
  addText(s, 'Why customers need this now: they want the control of software without the fatigue of another dashboard to ignore.', 216, 584, 850, 32, { size: 21, bold: true, typeface: 'Poppins', color: '#FFFFFF', autoFit: 'shrinkText' });
}

function slide4() {
  const s = deck.slides.add();
  addHeader(s, '04 Product / technology', 'A branded operating layer that adapts by business type', 'Core workflows stay practical. AI is layered where it saves time.');
  const center = addShape(s, 'roundRect', { left: 468, top: 288, width: 344, height: 136 }, C.navy, { width: 0, fill: C.navy });
  center.text = 'Pula Labs Workspace';
  center.text.typeface = 'Poppins';
  center.text.fontSize = 27;
  center.text.bold = true;
  center.text.color = '#FFFFFF';
  center.text.alignment = 'center';
  center.text.verticalAlignment = 'middle';
  const modules = [
    ['CRM', 'Leads, notes, ownership, pipeline', 120, 250, C.teal],
    ['Billing', 'Quotes, invoices, dues, finance view', 120, 428, C.saffron],
    ['Inventory', 'Stock, reorder watch, suppliers', 888, 250, C.green],
    ['Teams', 'Roles, access, workload clarity', 888, 428, C.coral],
    ['Operations', 'Tasks, calendar, issue raising', 468, 510, C.teal2],
    ['AI layer', 'Follow-ups, summaries, forecasts, tools', 468, 158, C.saffron],
  ];
  modules.forEach(([title, body, x, y, accent]) => {
    card(s, x, y, 270, 96, title, body, accent);
  });
  addText(s, 'Uniqueness: not a one-size dashboard; labels, stages, and suggestions adapt for retail, interiors, trading, services, and more.', 190, 642, 900, 34, { size: 15, color: C.muted, align: 'center', autoFit: 'shrinkText' });
}

function slide5() {
  const s = deck.slides.add();
  addHeader(s, '05 Business model', 'Simple subscription, optional AI credits, onboarding support', 'Revenue is designed around who pays, how much, and for what outcome.');
  const rows = [
    ['Plan', 'Buyer', 'What they pay for', 'Revenue logic'],
    ['Vyapar Starter', 'Owner-led businesses', 'Focused starting setup', 'Monthly per-account subscription'],
    ['Vyapar Growth', 'Growing teams', '3 more core tools + team members', 'Higher plan ARPA'],
    ['Vyapar Premium', 'Established operations', 'Full workspace + priority support', 'Scale plan + support value'],
    ['AI credits', 'Any plan', 'Generation, assistants, forecasts', 'Pay-as-needed usage revenue'],
  ];
  addTable(s, rows, 72, 260, 780, 290, [140, 170, 245, 210]);
  metric(s, 906, 264, 'Trial motion', '1 mo', 'Free trial and training support in repo pricing page', C.teal);
  metric(s, 906, 404, 'Pricing', 'TBD', 'Plan prices are masked in source and should be finalized', C.saffron);
  addText(s, 'Early monetization path: convert trial accounts into monthly subscriptions, expand modules as usage grows, and add AI credits only when customers see ROI.', 76, 594, 1050, 44, { size: 18, bold: true, typeface: 'Poppins', color: C.ink, autoFit: 'shrinkText' });
}

function slide6() {
  const s = deck.slides.add();
  addHeader(s, '06 Market opportunity', 'Focused on Indian businesses that need digitization without complexity', 'Use this model to plug in your actual geography, target verticals, pricing, and expected penetration.');
  const rows = [
    ['Layer', 'Definition', 'Customer count', 'Price / year', 'Potential'],
    ['TAM', 'Indian MSME / SME businesses needing operations software', '[Insert source count]', '[₹ / account]', '[₹]'],
    ['SAM', 'Retail, trading, interiors, and local service firms in target states', '[Insert count]', '[₹ / account]', '[₹]'],
    ['SOM', 'Reachable customers over first 36 months', '[Insert count]', '[₹ / account]', '[₹]'],
  ];
  addTable(s, rows, 72, 262, 878, 228, [90, 360, 140, 140, 140]);
  addShape(s, 'roundRect', { left: 990, top: 250, width: 204, height: 242 }, C.paleTeal, { width: 0, fill: C.paleTeal });
  addText(s, 'First wedge', 1018, 280, 150, 28, { size: 20, bold: true, typeface: 'Poppins', color: C.teal });
  addText(s, 'Retail shops\nInterior businesses\nTrading and wholesale\nService companies', 1018, 330, 150, 120, { size: 18, color: C.ink, autoFit: 'shrinkText' });
  addText(s, 'Investor note: Startup India asks for customer count x price x market potential. Keep this slide numeric once your target market source is finalized.', 88, 586, 1040, 42, { size: 16, color: C.muted, autoFit: 'shrinkText' });
}

function slide7() {
  const s = deck.slides.add();
  addHeader(s, '07 Current traction', 'Product foundation is built; customer proof should be added next', 'This slide separates verified product progress from founder-supplied traction still needed.');
  const timeline = [
    ['Built', 'Homepage, auth, dashboard shell, adaptive config'],
    ['Core modules', 'CRM, billing, inventory, team, operations, AI tools'],
    ['Commercial flow', 'Trial, pricing plans, support promise drafted'],
    ['Next proof', 'Add pilots, users, revenue, retention, testimonials'],
  ];
  timeline.forEach((t, i) => {
    const x = 86 + i * 284;
    addShape(s, 'ellipse', { left: x, top: 300, width: 46, height: 46 }, [C.teal, C.green, C.saffron, C.coral][i], { width: 0, fill: [C.teal, C.green, C.saffron, C.coral][i] });
    addText(s, String(i + 1), x, 309, 46, 24, { size: 18, bold: true, align: 'center', color: '#FFFFFF' });
    addShape(s, 'rect', { left: x + 46, top: 322, width: 210, height: 3 }, i === 3 ? '#FFFFFF00' : C.line, { width: 0, fill: i === 3 ? '#FFFFFF00' : C.line });
    card(s, x - 18, 380, 236, 130, t[0], t[1], [C.teal, C.green, C.saffron, C.coral][i]);
  });
  addText(s, 'Add when available: active accounts, pilots, paid customers, MRR, churn, customer logos, product screenshots, event photos, and founder/customer quotes.', 86, 594, 1060, 42, { size: 17, bold: true, typeface: 'Poppins', color: C.ink, autoFit: 'shrinkText' });
}

function slide8() {
  const s = deck.slides.add();
  addHeader(s, '08 Competitive landscape', 'Pula Labs wins by fitting the owner workflow, not by adding more modules', 'The plan is to be easier to adopt than generic enterprise tools and more complete than spreadsheets or point solutions.');
  const rows = [
    ['Alternative', 'Where it helps', 'Where Pula Labs can win'],
    ['Spreadsheets + WhatsApp', 'Familiar, low cost', 'Less manual chasing, better visibility, team accountability'],
    ['Accounting / billing tools', 'Invoices and compliance', 'Adds CRM, stock, operations, and AI layer around billing'],
    ['Generic CRM / ERP', 'Structured workflows', 'Business-specific labels, simpler onboarding, local owner focus'],
    ['Vertical SaaS tools', 'Deep in one niche', 'Flexible core that can adapt across multiple local business types'],
  ];
  addTable(s, rows, 74, 262, 850, 304, [190, 250, 390]);
  addShape(s, 'roundRect', { left: 970, top: 282, width: 210, height: 230 }, C.navy, { width: 0, fill: C.navy });
  addText(s, 'Plan to win', 1002, 314, 150, 28, { size: 21, bold: true, typeface: 'Poppins', color: '#FFFFFF' });
  addText(s, 'Start with owner pain.\nKeep setup simple.\nAdapt labels by industry.\nMake AI optional and useful.', 1002, 364, 150, 110, { size: 16, color: '#FFFFFFD8', autoFit: 'shrinkText' });
  addText(s, 'Avoid an inflated comparison matrix. Investors will take the positioning more seriously when it states trade-offs clearly.', 88, 606, 1040, 32, { size: 14, color: C.muted, autoFit: 'shrinkText' });
}

function slide9() {
  const s = deck.slides.add();
  addHeader(s, '09 Financials and unit economics', 'Three-year model placeholders for annual review', 'Replace assumptions with actual pricing, conversion, retention, and cost data before sending.');
  const rows = [
    ['Metric', 'Y1', 'Y2', 'Y3'],
    ['Paid accounts', '[ ]', '[ ]', '[ ]'],
    ['ARR / revenue', '₹[ ]', '₹[ ]', '₹[ ]'],
    ['Gross margin', '[ ]%', '[ ]%', '[ ]%'],
    ['OPEX', '₹[ ]', '₹[ ]', '₹[ ]'],
    ['EBITDA', '₹[ ]', '₹[ ]', '₹[ ]'],
  ];
  addTable(s, rows, 72, 270, 540, 280, [170, 110, 110, 110]);
  addShape(s, 'roundRect', { left: 670, top: 276, width: 470, height: 258 }, C.paper, { style: 'solid', fill: C.line, width: 1 });
  addText(s, 'Illustrative revenue plan', 700, 302, 280, 28, { size: 20, bold: true, typeface: 'Poppins' });
  [
    ['Y1', 56, '₹12L'],
    ['Y2', 120, '₹48L'],
    ['Y3', 204, '₹1.2Cr'],
  ].forEach(([year, height, value], i) => {
    const x = 742 + i * 116;
    addShape(s, 'rect', { left: x, top: 506 - height, width: 62, height }, [C.teal, C.green, C.saffron][i], { width: 0, fill: [C.teal, C.green, C.saffron][i] });
    addText(s, value, x - 12, 478 - height, 88, 24, { size: 14, bold: true, align: 'center', color: C.ink });
    addText(s, year, x, 522, 62, 20, { size: 14, bold: true, align: 'center', color: C.muted });
  });
  addText(s, 'Unit economics to fill: revenue per account, onboarding cost, monthly support cost, AI cost per active user, CAC, payback period.', 76, 600, 1060, 40, { size: 17, bold: true, typeface: 'Poppins', autoFit: 'shrinkText' });
}

function slide10() {
  const s = deck.slides.add();
  addHeader(s, '10 Funding needs', 'Raise amount, use of funds, runway, and milestones', 'This slide is intentionally structured for quick replacement once your round target and valuation are final.');
  addShape(s, 'roundRect', { left: 74, top: 264, width: 348, height: 250 }, C.navy, { width: 0, fill: C.navy });
  addText(s, 'Seeking', 104, 296, 150, 24, { size: 18, color: '#FFFFFFBB' });
  addText(s, '₹[amount]', 104, 334, 240, 58, { size: 44, bold: true, typeface: 'Poppins', color: C.saffron });
  addText(s, 'for [runway] months at proposed valuation ₹[valuation].', 108, 408, 250, 56, { size: 19, color: '#FFFFFF', autoFit: 'shrinkText' });
  const uses = [['Product + AI', '40%'], ['Sales + onboarding', '30%'], ['Customer success', '15%'], ['Cloud, legal, ops', '15%']];
  uses.forEach((u, i) => {
    card(s, 480 + (i % 2) * 330, 262 + Math.floor(i / 2) * 122, 286, 92, u[0], u[1], [C.teal, C.saffron, C.green, C.coral][i]);
  });
  addText(s, 'Milestones funded: [customers], ₹[revenue], [retention target], [new verticals], [follow-on capital plan].', 90, 588, 1040, 44, { size: 20, bold: true, typeface: 'Poppins', color: C.ink, autoFit: 'shrinkText' });
}

function slide11() {
  const s = deck.slides.add();
  addHeader(s, '11 Equity and fundraising history', 'Cap table and past investment summary', 'Startup India asks for current equity structure, money invested, and prior investors.');
  const cap = [
    ['Shareholder', 'Role', 'Current %', 'Notes'],
    ['[Founder name]', 'Founder / CEO', '[ ]%', 'Sweat + capital invested ₹[ ]'],
    ['[Co-founder name]', '[Role]', '[ ]%', '[Notes]'],
    ['ESOP pool', 'Future team', '[ ]%', '[Planned / created]'],
    ['Investors', '[Names]', '[ ]%', 'Prior round ₹[ ] in [year]'],
  ];
  addTable(s, cap, 74, 254, 820, 284, [220, 180, 110, 280]);
  addShape(s, 'roundRect', { left: 940, top: 278, width: 210, height: 214 }, C.paleSaffron, { width: 0, fill: C.paleSaffron });
  addText(s, 'Also add', 972, 310, 130, 28, { size: 20, bold: true, typeface: 'Poppins', color: C.saffron });
  addText(s, 'Founder investment\nDebt or grants\nCommitted co-investors\nAny SAFEs or notes', 972, 356, 150, 96, { size: 16, color: C.ink, autoFit: 'shrinkText' });
  addText(s, 'Keep this factual and current as of the date the deck is shared.', 90, 594, 1040, 32, { size: 15, color: C.muted, autoFit: 'shrinkText' });
}

async function slide12() {
  const s = deck.slides.add();
  s.background.fill = C.navy;
  await addLogo(s, 70, 58, 64);
  addText(s, 'Exit options', 154, 70, 260, 34, { size: 26, bold: true, typeface: 'Poppins', color: '#FFFFFF' });
  addText(s, 'Build a valuable operating layer for businesses that want practical AI and everyday control.', 74, 154, 740, 104, { size: 38, bold: true, typeface: 'Poppins', color: '#FFFFFF', autoFit: 'shrinkText' });
  const exits = [
    ['Strategic acquisition', 'Accounting, payments, ERP, CRM, commerce, or cloud platforms serving SMEs.'],
    ['Vertical SaaS consolidation', 'Acquire or partner across retail, trading, interiors, services, and local commerce.'],
    ['Long-term scale', 'Potential IPO path only after durable revenue, retention, and category leadership.'],
  ];
  exits.forEach((e, i) => card(s, 86 + i * 370, 346, 318, 142, e[0], e[1], [C.saffron, C.teal2, C.green][i]));
  addText(s, 'Next step: update placeholders with founder/team data, actual traction, round size, financial model, cap table, and contact details.', 86, 584, 900, 46, { size: 18, color: '#FFFFFFD8', autoFit: 'shrinkText' });
  addText(s, 'pulalabs.com', 970, 606, 190, 24, { size: 18, bold: true, color: C.saffron, align: 'right' });
}

await slide1();
await slide2();
slide3();
slide4();
slide5();
slide6();
slide7();
slide8();
slide9();
slide10();
slide11();
await slide12();

for (let i = 0; i < deck.slides.count; i += 1) {
  deck.slides.getItem(i).speakerNotes.setText(`Pula Labs Startup India pitch deck slide ${i + 1}. Replace bracketed placeholders with verified company data before investor submission.`);
}

const preview = await deck.export({ slide: deck.slides.getItem(0), format: 'png', scale: 1 });
if (preview && typeof preview.save === 'function') {
  await preview.save(path.join(SCRATCH_DIR, 'slide-01-preview.png'));
} else if (preview instanceof Uint8Array || preview instanceof ArrayBuffer) {
  await fs.writeFile(path.join(SCRATCH_DIR, 'slide-01-preview.png'), Buffer.from(preview));
} else if (preview && typeof preview.arrayBuffer === 'function') {
  await fs.writeFile(path.join(SCRATCH_DIR, 'slide-01-preview.png'), Buffer.from(await preview.arrayBuffer()));
}
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(PPTX);
console.log(PPTX);
