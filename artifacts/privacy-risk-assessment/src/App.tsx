import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileDown,
  Fingerprint,
  Globe2,
  KeyRound,
  LockKeyhole,
  Menu,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  getGetAssessmentQueryKey,
  getGetDashboardStatsQueryKey,
  getGetPrivacyChecklistQueryKey,
  useCreateAssessment,
  useGetAssessment,
  useGetDashboardStats,
  useGetPrivacyChecklist,
  useSimulateImprovement,
  type AssessmentInput,
  type ChecklistItem,
  type DashboardStats,
  type SimulationInputImprovementsItem,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import {
  Link,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
  useParams,
} from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

type Question = {
  key: keyof AssessmentInput;
  category: string;
  prompt: string;
  helper: string;
  kind: 'boolean' | 'choice';
  options?: { value: string; label: string; note: string }[];
};

const defaultAnswers: AssessmentInput = {
  profileVisibility: 'friends',
  searchEngineVisibility: false,
  followersVisibility: 'friends',
  friendsListVisibility: 'friends',
  phonePublic: false,
  emailPublic: false,
  birthdayPublic: false,
  homeInfoPublic: false,
  workplacePublic: true,
  educationPublic: true,
  relationshipPublic: false,
  realTimeLocation: false,
  geotagging: false,
  checkIns: false,
  homeLocationExposure: false,
  workLocationExposure: false,
  travelPlans: false,
  frequentLocationPatterns: false,
  postsVisibility: 'friends',
  historicalPostsReviewed: false,
  photoMetadataAware: false,
  photoDocumentExposure: false,
  unknownConnections: 'sometimes',
  friendFollowerReview: false,
  tagReviewEnabled: false,
  anyoneCanTag: true,
  autoTaggedPosts: true,
  unknownMentions: false,
  mfaEnabled: false,
  uniquePassword: true,
  passwordManagerUsed: false,
  loginAlertsEnabled: false,
  recoveryInfoReviewed: false,
  activeSessionsReviewed: false,
  unknownDevicesChecked: false,
  thirdPartyAppsReviewed: false,
  unusedAppsPresent: true,
  unnecessaryPermissions: true,
  suspiciousLinksAwareness: 'medium',
  verificationCodesShared: false,
  personalInfoInMessages: false,
  impersonationAwareness: 'medium',
  suspiciousGiveaways: false,
  oldAccountsReviewed: false,
  publicCommentsReviewed: false,
  privacySettingsReviewed: false,
};

const choice = (values: [string, string, string][]) =>
  values.map(([value, label, note]) => ({ value, label, note }));

const questions: Question[] = [
  { key: 'profileVisibility', category: 'Profile & reach', prompt: 'Who can view your main profile?', helper: 'Think about the default audience, not a single post.', kind: 'choice', options: choice([['public', 'Anyone', 'Your profile is visible beyond your network.'], ['friends', 'Approved connections', 'Only accepted followers can see it.'], ['private', 'Only you / restricted', 'The tightest audience setting.']]) },
  { key: 'searchEngineVisibility', category: 'Profile & reach', prompt: 'Can search engines link to your profile?', helper: 'This setting is often separate from profile visibility.', kind: 'boolean' },
  { key: 'followersVisibility', category: 'Profile & reach', prompt: 'Who can see your follower list?', helper: 'Follower lists can reveal relationships and interests.', kind: 'choice', options: choice([['public', 'Anyone', 'Visible to people outside your network.'], ['friends', 'Approved connections', 'Visible to people you have accepted.'], ['private', 'Only you / restricted', 'Not broadly discoverable.']]) },
  { key: 'friendsListVisibility', category: 'Profile & reach', prompt: 'Who can see your friends or following list?', helper: 'A private list limits relationship mapping.', kind: 'choice', options: choice([['public', 'Anyone', 'Broadly visible.'], ['friends', 'Approved connections', 'Visible to your network.'], ['private', 'Only you / restricted', 'Kept out of view.']]) },
  { key: 'phonePublic', category: 'Personal details', prompt: 'Is your phone number visible on your profile?', helper: 'We never ask for the number itself.', kind: 'boolean' },
  { key: 'emailPublic', category: 'Personal details', prompt: 'Is your email address visible on your profile?', helper: 'We only need to know whether the setting is exposed.', kind: 'boolean' },
  { key: 'birthdayPublic', category: 'Personal details', prompt: 'Is your full birthday public?', helper: 'A year or month alone carries less exposure.', kind: 'boolean' },
  { key: 'homeInfoPublic', category: 'Personal details', prompt: 'Have you shared your home address or detailed home information?', helper: 'Include old posts that are still public.', kind: 'boolean' },
  { key: 'workplacePublic', category: 'Personal details', prompt: 'Is your workplace or employer visible?', helper: 'A broad industry is less identifying than a named location.', kind: 'boolean' },
  { key: 'educationPublic', category: 'Personal details', prompt: 'Is your school or education history visible?', helper: 'Consider profile fields and public posts together.', kind: 'boolean' },
  { key: 'relationshipPublic', category: 'Personal details', prompt: 'Is your relationship status visible?', helper: 'A yes means anyone outside your approved audience can see it.', kind: 'boolean' },
  { key: 'realTimeLocation', category: 'Location signals', prompt: 'Do you share your live location while you are there?', helper: 'This includes live maps, stories, and real-time posts.', kind: 'boolean' },
  { key: 'geotagging', category: 'Location signals', prompt: 'Are location tags added to your photos or posts?', helper: 'We do not need to know which places.', kind: 'boolean' },
  { key: 'checkIns', category: 'Location signals', prompt: 'Do you publish check-ins or venue visits?', helper: 'Even a harmless check-in can create a routine over time.', kind: 'boolean' },
  { key: 'homeLocationExposure', category: 'Location signals', prompt: 'Could someone infer your home location from your profile?', helper: 'Think landmarks, street views, and repeated references.', kind: 'boolean' },
  { key: 'workLocationExposure', category: 'Location signals', prompt: 'Could someone infer where you work or study?', helper: 'A yes includes recurring commute or campus clues.', kind: 'boolean' },
  { key: 'travelPlans', category: 'Location signals', prompt: 'Do you post travel plans before leaving?', helper: 'Sharing after returning is usually safer.', kind: 'boolean' },
  { key: 'frequentLocationPatterns', category: 'Location signals', prompt: 'Could your regular schedule be inferred from posts?', helper: 'Look for repeated times, routes, or places.', kind: 'boolean' },
  { key: 'postsVisibility', category: 'Content hygiene', prompt: 'Who can see your everyday posts?', helper: 'Review the platform-wide default audience.', kind: 'choice', options: choice([['public', 'Anyone', 'Every post can travel beyond your network.'], ['friends', 'Approved connections', 'A narrower default audience.'], ['private', 'Only you / restricted', 'Most controlled default.']]) },
  { key: 'historicalPostsReviewed', category: 'Content hygiene', prompt: 'Have you reviewed older posts and stories?', helper: 'Archive, remove, or narrow the audience where needed.', kind: 'boolean' },
  { key: 'photoMetadataAware', category: 'Content hygiene', prompt: 'Do you check for photo metadata before sharing?', helper: 'Some files can carry capture or device details.', kind: 'boolean' },
  { key: 'photoDocumentExposure', category: 'Content hygiene', prompt: 'Have you avoided sharing visible documents or passes?', helper: 'Blur codes, addresses, and identifiers before posting.', kind: 'boolean' },
  { key: 'unknownConnections', category: 'Connections & tags', prompt: 'How often do you accept unknown connection requests?', helper: 'Use your usual behavior over the last few months.', kind: 'choice', options: choice([['often', 'Often', 'You usually accept without a close review.'], ['sometimes', 'Sometimes', 'You decide case by case.'], ['rarely', 'Rarely', 'You keep your network familiar.']]) },
  { key: 'friendFollowerReview', category: 'Connections & tags', prompt: 'Do you periodically review followers or friends?', helper: 'Remove accounts you no longer recognize or trust.', kind: 'boolean' },
  { key: 'tagReviewEnabled', category: 'Connections & tags', prompt: 'Do you review tags before they appear?', helper: 'Tag review gives you a pause before content is linked to you.', kind: 'boolean' },
  { key: 'anyoneCanTag', category: 'Connections & tags', prompt: 'Can anyone tag you in a post or photo?', helper: 'A yes means the setting is open to people outside your network.', kind: 'boolean' },
  { key: 'autoTaggedPosts', category: 'Connections & tags', prompt: 'Are tagged posts automatically added to your profile?', helper: 'Manual review is the safer default.', kind: 'boolean' },
  { key: 'unknownMentions', category: 'Connections & tags', prompt: 'Do unknown accounts often mention you?', helper: 'Consider spam, impersonation, and unwanted visibility.', kind: 'boolean' },
  { key: 'mfaEnabled', category: 'Account security', prompt: 'Is multi-factor authentication enabled?', helper: 'An authenticator app or security key is strongest.', kind: 'boolean' },
  { key: 'uniquePassword', category: 'Account security', prompt: 'Does this account have a unique password?', helper: 'We do not ask for the password or a hint.', kind: 'boolean' },
  { key: 'passwordManagerUsed', category: 'Account security', prompt: 'Do you use a password manager?', helper: 'A manager makes unique passwords easier to keep.', kind: 'boolean' },
  { key: 'loginAlertsEnabled', category: 'Account security', prompt: 'Are new-login alerts enabled?', helper: 'Alerts help you spot access you did not initiate.', kind: 'boolean' },
  { key: 'recoveryInfoReviewed', category: 'Account security', prompt: 'Have you reviewed your recovery options recently?', helper: 'Remove old phone numbers and email addresses.', kind: 'boolean' },
  { key: 'activeSessionsReviewed', category: 'Account security', prompt: 'Have you checked active sessions or logged-in devices?', helper: 'Sign out of sessions you do not recognize.', kind: 'boolean' },
  { key: 'unknownDevicesChecked', category: 'Account security', prompt: 'Do you investigate devices you do not recognize?', helper: 'This is separate from reviewing the list itself.', kind: 'boolean' },
  { key: 'thirdPartyAppsReviewed', category: 'Apps & permissions', prompt: 'Have you reviewed connected third-party apps?', helper: 'Revoke access you no longer need.', kind: 'boolean' },
  { key: 'unusedAppsPresent', category: 'Apps & permissions', prompt: 'Do unused apps still have access to your account?', helper: 'A yes means an old connection may still be active.', kind: 'boolean' },
  { key: 'unnecessaryPermissions', category: 'Apps & permissions', prompt: 'Do connected apps have permissions they do not need?', helper: 'Choose yes if you have not checked or trimmed them.', kind: 'boolean' },
  { key: 'suspiciousLinksAwareness', category: 'Scams & messages', prompt: 'How confident are you at spotting suspicious links?', helper: 'Use your honest instinct; this is not a test.', kind: 'choice', options: choice([['high', 'High confidence', 'You pause and verify before opening.'], ['medium', 'Some confidence', 'You sometimes check, sometimes click.'], ['low', 'Low confidence', 'You would like a clearer process.']]) },
  { key: 'verificationCodesShared', category: 'Scams & messages', prompt: 'Have you ever shared a verification code with someone?', helper: 'Support teams should never ask for a one-time code.', kind: 'boolean' },
  { key: 'personalInfoInMessages', category: 'Scams & messages', prompt: 'Do you send sensitive personal information in direct messages?', helper: 'Consider IDs, financial details, and access codes.', kind: 'boolean' },
  { key: 'impersonationAwareness', category: 'Scams & messages', prompt: 'How confident are you at spotting impersonation?', helper: 'Look for urgency, unusual requests, and new accounts.', kind: 'choice', options: choice([['high', 'High confidence', 'You verify through a second channel.'], ['medium', 'Some confidence', 'You can spot some warning signs.'], ['low', 'Low confidence', 'You want a simple verification habit.']]) },
  { key: 'suspiciousGiveaways', category: 'Scams & messages', prompt: 'Do you know how to verify giveaways and urgent offers?', helper: 'A yes means you have a reliable verification step.', kind: 'boolean' },
  { key: 'oldAccountsReviewed', category: 'Review rhythm', prompt: 'Have you reviewed or closed old social accounts?', helper: 'Dormant accounts can still expose profile information.', kind: 'boolean' },
  { key: 'publicCommentsReviewed', category: 'Review rhythm', prompt: 'Have you reviewed old public comments?', helper: 'Comments can reveal more context than your profile.', kind: 'boolean' },
  { key: 'privacySettingsReviewed', category: 'Review rhythm', prompt: 'Have you reviewed privacy settings in the last year?', helper: 'Platforms change defaults and controls over time.', kind: 'boolean' },
];

const categoryMeta: Record<string, { icon: LucideIcon; accent: string }> = {
  'Profile & reach': { icon: Globe2, accent: 'bg-[#dcebea] text-[#1f6262]' },
  'Personal details': { icon: UserRound, accent: 'bg-[#f2e6d0] text-[#9a621d]' },
  'Location signals': { icon: Target, accent: 'bg-[#e8dfed] text-[#694c77]' },
  'Content hygiene': { icon: ClipboardCheck, accent: 'bg-[#dfe9dc] text-[#4b714b]' },
  'Connections & tags': { icon: Fingerprint, accent: 'bg-[#e8e1d5] text-[#6b5c43]' },
  'Account security': { icon: KeyRound, accent: 'bg-[#d9e6eb] text-[#34677b]' },
  'Apps & permissions': { icon: LockKeyhole, accent: 'bg-[#e9e3d5] text-[#80632e]' },
  'Scams & messages': { icon: AlertTriangle, accent: 'bg-[#f2dfd7] text-[#a65342]' },
  'Review rhythm': { icon: RefreshCw, accent: 'bg-[#dce9e5] text-[#387367]' },
};

const fallbackStats: DashboardStats = {
  totalAssessments: 1842,
  averageScore: 72,
  riskDistribution: { LOW: 438, MODERATE: 927, HIGH: 385, CRITICAL: 92 },
  topWeaknesses: [
    { label: 'Account security', count: 614 },
    { label: 'Location signals', count: 487 },
    { label: 'Apps & permissions', count: 421 },
  ],
  controlCoverage: [
    { label: 'MFA enabled', enabled: 1214, total: 1842 },
    { label: 'Tag review', enabled: 957, total: 1842 },
    { label: 'Historical review', enabled: 888, total: 1842 },
  ],
};

const fallbackChecklist: ChecklistItem[] = [
  { id: 'audience', label: 'Review profile, follower, and post visibility', category: 'Audience' },
  { id: 'details', label: 'Hide phone, email, birthday, and home details', category: 'Personal details' },
  { id: 'location', label: 'Turn off live location and review old location tags', category: 'Location' },
  { id: 'history', label: 'Archive or narrow the audience for older posts', category: 'Content' },
  { id: 'tags', label: 'Enable tag review and limit who can mention you', category: 'Connections' },
  { id: 'mfa', label: 'Enable multi-factor authentication', category: 'Account security' },
  { id: 'sessions', label: 'Review active sessions and connected apps', category: 'Account security' },
  { id: 'messages', label: 'Never share verification codes in messages', category: 'Scams' },
  { id: 'accounts', label: 'Close or secure old social accounts', category: 'Maintenance' },
];

function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const nav = [
    { href: '/', label: 'Overview', icon: BarChart3 },
    { href: '/assessment', label: 'Privacy review', icon: ShieldCheck },
    { href: '/checklist', label: 'Action checklist', icon: ClipboardCheck },
  ];
  return (
    <div className="app-shell min-h-[100dvh] text-[#19343a]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[255px] flex-col bg-[#19343a] px-5 py-6 text-[#f4f0e7] transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d7a85f] text-[#19343a]"><ShieldCheck size={22} strokeWidth={2.3} /></span>
            <span><span className="display-font block text-lg font-semibold tracking-tight">QuietSignal</span><span className="block text-[10px] uppercase tracking-[.2em] text-[#b7c9c5]">privacy review</span></span>
          </Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu" aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="mt-12 flex-1">
          <p className="eyebrow mb-4 text-[#91aca8]">Workspace</p>
          <nav className="space-y-1">
            {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${location === href ? 'bg-[#2d5459] text-[#f7f2e8]' : 'text-[#b7c9c5] hover:bg-[#24494e] hover:text-[#f7f2e8]'}`}><Icon size={17} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d7a85f]" />}</Link>)}
          </nav>
          <div className="mt-10 rounded-2xl border border-[#345b60] bg-[#21454a] p-4">
            <p className="eyebrow text-[#d7a85f]">Private by design</p>
            <p className="mt-3 text-sm leading-6 text-[#d7e1dc]">Your answers are limited to safe settings and habits. No handles, passwords, or message content.</p>
          </div>
        </div>
        <div className="border-t border-[#345b60] pt-4 text-xs leading-5 text-[#91aca8]">A calmer way to make safer choices online.</div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation overlay" data-testid="button-overlay-menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[#19343a]/35 lg:hidden" />}
      <div className="lg:pl-[255px]">
        <header className="no-print sticky top-0 z-20 border-b border-[#d9d1c1] bg-[#f6f3ec]/90 px-5 py-4 backdrop-blur-md sm:px-8">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between">
            <button className="rounded-lg p-2 hover:bg-[#ebe5d8] lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu" aria-label="Open navigation"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-xs text-[#66807d] sm:flex"><span className="h-2 w-2 rounded-full bg-[#6b9b8a]" /> No sensitive data collected</div>
            <div className="ml-auto flex items-center gap-3 text-xs text-[#66807d]"><span className="hidden sm:inline">Social privacy coaching</span><span className="h-8 w-8 rounded-full border border-[#cfc5b5] bg-[#e9e2d5] p-1.5"><LockKeyhole size={16} /></span></div>
          </div>
        </header>
        <main className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-12">{children}</main>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow text-[#9b6d2f]">{eyebrow}</p><h1 className="display-font mt-2 max-w-2xl text-3xl font-semibold tracking-[-.035em] text-[#19343a] sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#5d7470]">{detail}</p></div>{action}</div>;
}

function MetricCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: LucideIcon }) {
  return <div className="rounded-2xl border border-[#ded6c8] bg-[#fbf9f4] p-5 shadow-[0_5px_14px_rgba(25,52,58,.05)]" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><p className="text-sm text-[#66807d]">{label}</p><span className="rounded-lg bg-[#e7efeb] p-2 text-[#40766a]"><Icon size={17} /></span></div><p className="display-font mt-5 text-4xl font-semibold tracking-[-.05em] text-[#19343a]">{value}</p><p className="mt-2 text-xs text-[#7d8e8a]">{note}</p></div>;
}

function Home() {
  const statsQuery = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const stats = statsQuery.data ?? fallbackStats;
  const isPreview = !statsQuery.data;
  const dist = stats.riskDistribution;
  const totalRisk = Object.values(dist).reduce((sum, value) => sum + value, 0) || 1;
  return <Shell><SectionHeading eyebrow="Overview / aggregate view" title="A clear read on everyday privacy." detail="QuietSignal turns small social habits into practical protection. Review your exposure, choose one change, and move on with more confidence." action={<Link href="/assessment" data-testid="link-start-assessment" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#19343a] px-5 py-3 text-sm font-semibold text-[#f7f2e8] shadow-[0_8px_18px_rgba(25,52,58,.15)] transition-transform hover:-translate-y-0.5">Start a private review <ArrowRight size={16} /></Link>} />
    {isPreview && <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#e2cda8] bg-[#fbf3df] px-4 py-3 text-sm text-[#765629]" data-testid="status-dashboard-preview"><CircleHelp size={16} /> Aggregate view is warming up. Figures shown are a safe sample while the service responds.</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Reviews completed" value={stats.totalAssessments.toLocaleString()} note="Across the QuietSignal community" icon={ClipboardCheck} />
      <MetricCard label="Average privacy score" value={`${Math.round(stats.averageScore)}/100`} note="Higher means more control" icon={BarChart3} />
      <MetricCard label="Controls covered" value={`${Math.round((stats.controlCoverage.reduce((a, b) => a + b.enabled, 0) / Math.max(1, stats.controlCoverage.reduce((a, b) => a + b.total, 0))) * 100)}%`} note="Across common protections" icon={ShieldCheck} />
      <MetricCard label="Most common gap" value={stats.topWeaknesses[0]?.label ?? 'Review rhythm'} note="A useful first place to look" icon={Target} />
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-2xl border border-[#ded6c8] bg-[#fbf9f4] p-6 sm:p-8">
        <div className="flex items-start justify-between"><div><p className="eyebrow text-[#66807d]">Community signal</p><h2 className="display-font mt-2 text-2xl font-semibold">Risk distribution</h2></div><span className="rounded-full bg-[#e7efeb] px-3 py-1 text-xs font-medium text-[#40766a]">Synthetic aggregate</span></div>
        <div className="mt-9 space-y-5">
          {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map((risk) => <div key={risk} data-testid={`row-risk-${risk.toLowerCase()}`}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-[#385d5d]">{risk[0] + risk.slice(1).toLowerCase()}</span><span className="text-[#7d8e8a]">{dist[risk] ?? 0} reviews</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e7e0d4]"><div className={`h-full rounded-full ${risk === 'LOW' ? 'bg-[#6e9c89]' : risk === 'MODERATE' ? 'bg-[#d0a258]' : risk === 'HIGH' ? 'bg-[#bd7b57]' : 'bg-[#9c5547]'}`} style={{ width: `${((dist[risk] ?? 0) / totalRisk) * 100}%` }} /></div></div>)}
        </div>
      </section>
      <section className="rounded-2xl border border-[#ded6c8] bg-[#19343a] p-6 text-[#f7f2e8] sm:p-8">
        <p className="eyebrow text-[#d7a85f]">Start with what matters</p><h2 className="display-font mt-2 text-2xl font-semibold">Your review is a private conversation with yourself.</h2><p className="mt-4 text-sm leading-7 text-[#c6d3cd]">There are no names, handles, screenshots, or passwords here. Just settings, habits, and a short plan you can actually use.</p><Link href="/assessment" data-testid="link-hero-assessment" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#d7a85f] px-4 py-3 text-sm font-semibold text-[#19343a] transition-transform hover:-translate-y-0.5">Begin in about 7 minutes <ArrowRight size={16} /></Link>
        <div className="mt-10 grid grid-cols-3 gap-2 border-t border-[#345b60] pt-5 text-center"><div><p className="display-font text-2xl">40+</p><p className="mt-1 text-[11px] text-[#9eb5ae]">safe questions</p></div><div><p className="display-font text-2xl">9</p><p className="mt-1 text-[11px] text-[#9eb5ae]">privacy areas</p></div><div><p className="display-font text-2xl">0</p><p className="mt-1 text-[11px] text-[#9eb5ae]">sensitive values</p></div></div>
      </section>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#ded6c8] bg-[#fbf9f4] p-6"><p className="eyebrow text-[#66807d]">Common places to focus</p><div className="mt-5 space-y-4">{stats.topWeaknesses.map((item, index) => <div className="flex items-center gap-4" key={item.label} data-testid={`weakness-${index}`}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7efeb] text-sm font-semibold text-[#40766a]">0{index + 1}</span><div className="flex-1"><div className="flex justify-between text-sm"><span className="font-medium">{item.label}</span><span className="text-[#7d8e8a]">{item.count}</span></div><div className="mt-2 h-1.5 rounded-full bg-[#e7e0d4]"><div className="h-full rounded-full bg-[#6e9c89]" style={{ width: `${Math.min(100, item.count / Math.max(1, stats.topWeaknesses[0]?.count) * 100)}%` }} /></div></div></div>)}</div></section>
      <section className="rounded-2xl border border-[#ded6c8] bg-[#fbf9f4] p-6"><p className="eyebrow text-[#66807d]">Control coverage</p><div className="mt-5 space-y-5">{stats.controlCoverage.map((item, index) => <div key={item.label} data-testid={`coverage-${index}`}><div className="flex justify-between text-sm"><span className="font-medium">{item.label}</span><span className="text-[#7d8e8a]">{Math.round((item.enabled / Math.max(1, item.total)) * 100)}%</span></div><div className="mt-2 h-2 rounded-full bg-[#e7e0d4]"><div className="h-full rounded-full bg-[#d0a258]" style={{ width: `${(item.enabled / Math.max(1, item.total)) * 100}%` }} /></div></div>)}</div></section>
    </div>
  </Shell>;
}

function BooleanChoice({ value, onChange }: { value: boolean | undefined; onChange: (value: boolean) => void }) {
  return <div className="grid grid-cols-2 gap-3 sm:max-w-md">{[['yes', true, 'Yes'], ['no', false, 'No']] .map(([id, answer, label]) => <button key={id as string} type="button" data-testid={`button-answer-${id}`} onClick={() => onChange(answer as boolean)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${value === answer ? 'border-[#2f7772] bg-[#e5f0ed] text-[#1f5e5b]' : 'border-[#ddd3c3] bg-[#fbf9f4] text-[#5d7470] hover:border-[#aebfb7]'}`}><span>{label as string}</span>{value === answer && <Check size={16} />}</button>)}</div>;
}

function AssessmentPage() {
  const [, setLocation] = useLocation();
  const createAssessment = useCreateAssessment();
  const [answers, setAnswers] = useState<Partial<AssessmentInput>>({});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const sections = useMemo(() => Array.from(new Set(questions.map((question) => question.category))), []);
  const section = sections[sectionIndex];
  const sectionQuestions = questions.filter((question) => question.category === section);
  const question = sectionQuestions[questionIndex];
  const questionNumber = questions.findIndex((item) => item.key === question.key) + 1;
  const completed = questionNumber - 1;
  const isLast = sectionIndex === sections.length - 1 && questionIndex === sectionQuestions.length - 1;
  const answered = answers[question.key] !== undefined;
  const updateAnswer = (value: string | boolean) => setAnswers((current) => ({ ...current, [question.key]: value } as AssessmentInput));
  const goNext = () => {
    if (!isLast) {
      if (questionIndex < sectionQuestions.length - 1) setQuestionIndex((value) => value + 1);
      else { setSectionIndex((value) => value + 1); setQuestionIndex(0); }
    } else {
      const payload = answers as AssessmentInput;
      sessionStorage.setItem('quietSignal:last-input', JSON.stringify(payload));
      createAssessment.mutate({ data: payload }, { onSuccess: (assessment) => { sessionStorage.setItem(`quietSignal:input:${assessment.assessmentId}`, JSON.stringify(payload)); setLocation(`/results/${assessment.assessmentId}`); } });
    }
  };
  const goBack = () => {
    if (questionIndex > 0) setQuestionIndex((value) => value - 1);
    else if (sectionIndex > 0) { const prior = sections[sectionIndex - 1]; setSectionIndex((value) => value - 1); setQuestionIndex(questions.filter((item) => item.category === prior).length - 1); }
  };
  const isChoice = question.kind === 'choice';
  return <Shell><div className="mx-auto max-w-4xl">
    <div className="mb-8 flex items-center justify-between"><div><p className="eyebrow text-[#9b6d2f]">Private review / {sectionIndex + 1} of {sections.length}</p><h1 className="display-font mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">A few honest signals.</h1></div><Link href="/" data-testid="link-exit-assessment" className="hidden items-center gap-2 text-sm text-[#66807d] hover:text-[#19343a] sm:flex"><X size={16} /> Save for later is not available</Link></div>
    <div className="mb-7 flex items-center gap-2">{sections.map((item, index) => <div key={item} className="flex-1" data-testid={`progress-section-${index}`}><div className={`h-1.5 rounded-full ${index <= sectionIndex ? 'bg-[#40766a]' : 'bg-[#dfd7ca]'}`} /><p className={`mt-2 hidden text-[10px] font-semibold uppercase tracking-[.12em] sm:block ${index === sectionIndex ? 'text-[#40766a]' : 'text-[#9aa6a1]'}`}>{item}</p></div>)}</div>
    <div className="rounded-3xl border border-[#ded6c8] bg-[#fbf9f4] p-6 shadow-[0_12px_32px_rgba(25,52,58,.06)] sm:p-10">
      <div className="flex items-center justify-between"><span className="rounded-full bg-[#e7efeb] px-3 py-1.5 text-xs font-semibold text-[#40766a]" data-testid="status-question-count">Question {questionNumber} of {questions.length}</span><span className="text-xs text-[#7d8e8a]">{Math.round((completed / questions.length) * 100)}% complete</span></div>
      <div className="mt-10"><p className="eyebrow text-[#9b6d2f]">{question.category}</p><h2 className="display-font mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-[-.035em] sm:text-4xl" data-testid={`text-question-${question.key}`}>{question.prompt}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#66807d]">{question.helper}</p></div>
      <div className="mt-10">{isChoice ? <div className="grid gap-3 sm:grid-cols-3">{question.options?.map((option) => <button key={option.value} type="button" data-testid={`button-option-${question.key}-${option.value}`} onClick={() => updateAnswer(option.value)} className={`rounded-2xl border p-4 text-left transition ${answers[question.key] === option.value ? 'border-[#2f7772] bg-[#e5f0ed] shadow-[0_0_0_3px_rgba(64,118,106,.10)]' : 'border-[#ddd3c3] bg-[#fffdf8] hover:-translate-y-0.5 hover:border-[#aebfb7]'}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold">{option.label}</span>{answers[question.key] === option.value && <Check size={16} className="text-[#40766a]" />}</div><p className="mt-2 text-xs leading-5 text-[#7d8e8a]">{option.note}</p></button>)}</div> : <BooleanChoice value={typeof answers[question.key] === 'boolean' ? answers[question.key] as boolean : undefined} onChange={updateAnswer} />}</div>
      {!answered && <p className="mt-4 text-xs font-medium text-[#a3513d]" data-testid="status-question-required">Choose one answer to continue.</p>}
      {createAssessment.isError && <div className="mt-6 flex items-start gap-2 rounded-xl border border-[#e1b9ac] bg-[#f8e8e2] p-4 text-sm text-[#8e493d]" data-testid="status-assessment-error"><AlertTriangle size={17} className="mt-0.5 shrink-0" /> We could not save this review. Nothing was stored locally as a substitute. Please try again.</div>}
      <div className="mt-12 flex items-center justify-between border-t border-[#e7dfd1] pt-6"><button type="button" onClick={goBack} disabled={sectionIndex === 0 && questionIndex === 0} data-testid="button-previous-question" className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[#66807d] transition hover:bg-[#eee8dc] disabled:invisible"><ChevronLeft size={17} /> Back</button><button type="button" onClick={goNext} disabled={createAssessment.isPending || !answered} data-testid="button-next-question" className="inline-flex items-center gap-2 rounded-xl bg-[#19343a] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{createAssessment.isPending ? 'Saving review…' : isLast ? 'See my private report' : 'Continue'}{!createAssessment.isPending && <ChevronRight size={17} />}</button></div>
    </div>
    <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#ded6c8] bg-[#f1eee6] px-4 py-3 text-xs leading-5 text-[#66807d]" data-testid="status-safe-data"><LockKeyhole size={15} className="shrink-0 text-[#40766a]" /> Safe-data notice: every response is a boolean or broad choice. No sensitive values are requested.</div>
  </div></Shell>;
}

function riskTone(risk: string) {
  if (risk === 'LOW') return 'bg-[#dcebe2] text-[#356c57]';
  if (risk === 'MODERATE') return 'bg-[#f4e6c7] text-[#916323]';
  if (risk === 'HIGH') return 'bg-[#f2ddd0] text-[#a3513d]';
  return 'bg-[#ead5d2] text-[#8b4037]';
}

function ResultsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const assessmentQuery = useGetAssessment(id, { query: { enabled: Boolean(id), queryKey: getGetAssessmentQueryKey(id) } });
  const simulate = useSimulateImprovement();
  const assessment = assessmentQuery.data;
  const [selected, setSelected] = useState<SimulationInputImprovementsItem[]>([]);
  const input = useMemo(() => { try { const raw = sessionStorage.getItem(`quietSignal:input:${id}`) ?? sessionStorage.getItem('quietSignal:last-input'); return raw ? JSON.parse(raw) as AssessmentInput : null; } catch { return null; } }, [id]);
  const improvements: { key: SimulationInputImprovementsItem; label: string; detail: string }[] = [
    { key: 'enableMfa', label: 'Enable multi-factor authentication', detail: 'Add a second proof of identity at login.' },
    { key: 'reduceLocationSharing', label: 'Reduce location sharing', detail: 'Pause live location, check-ins, and routine clues.' },
    { key: 'makeContactPrivate', label: 'Make contact details private', detail: 'Keep phone and email outside your public profile.' },
    { key: 'enableTagReview', label: 'Turn on tag review', detail: 'Approve tags before they appear on your profile.' },
    { key: 'reviewThirdPartyApps', label: 'Review connected apps', detail: 'Remove access you no longer use.' },
    { key: 'reviewHistoricalPosts', label: 'Review historical posts', detail: 'Narrow the audience for older content.' },
    { key: 'reviewPrivacySettings', label: 'Review privacy settings', detail: 'Revisit platform defaults and audience controls.' },
    { key: 'rejectUnknownConnections', label: 'Reject unknown connections', detail: 'Keep your network familiar and intentional.' },
  ];
  const toggle = (key: SimulationInputImprovementsItem) => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  if (assessmentQuery.isLoading) return <Shell><LoadingBlock label="Preparing your private report" /></Shell>;
  if (assessmentQuery.isError || !assessment) return <Shell><ErrorBlock title="This report is unavailable" detail="The report may have expired or the link may be incomplete." href="/assessment" action="Start a new review" /></Shell>;
  return <Shell><SectionHeading eyebrow="Your private report" title="Useful clarity, not a verdict." detail={`Completed ${new Date(assessment.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}. Your score is a snapshot of settings and habits you can change.`} action={<Link href="/checklist" data-testid="link-results-checklist" className="inline-flex items-center gap-2 rounded-xl border border-[#cfc5b5] bg-[#fbf9f4] px-4 py-3 text-sm font-semibold text-[#385d5d] hover:bg-[#f0eadf]"><ClipboardCheck size={16} /> Open checklist</Link>} />
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-3xl bg-[#19343a] p-7 text-[#f7f2e8] sm:p-9"><p className="eyebrow text-[#d7a85f]">Overall protection score</p><div className="mt-7 flex items-end gap-3"><span className="display-font text-7xl font-semibold tracking-[-.08em]" data-testid="text-overall-score">{Math.round(assessment.overallScore)}</span><span className="mb-2 text-[#a9bbb4]">/ 100</span></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-[#345b60]"><div className="h-full rounded-full bg-[#d7a85f]" style={{ width: `${assessment.overallScore}%` }} /></div><div className="mt-5 flex items-center justify-between"><span className="text-sm text-[#c6d3cd]">Current risk level</span><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${riskTone(assessment.riskLevel)}`} data-testid="status-risk-level">{assessment.riskLevel}</span></div><div className="mt-9 grid grid-cols-2 gap-3 border-t border-[#345b60] pt-5"><div><p className="display-font text-2xl">{assessment.controlsEnabled}</p><p className="mt-1 text-xs text-[#9eb5ae]">controls enabled</p></div><div><p className="display-font text-2xl">{assessment.highRiskCategories}</p><p className="mt-1 text-xs text-[#9eb5ae]">areas to prioritize</p></div></div></section>
      <section className="rounded-3xl border border-[#ded6c8] bg-[#fbf9f4] p-7 sm:p-9"><div className="flex items-start justify-between"><div><p className="eyebrow text-[#66807d]">Category breakdown</p><h2 className="display-font mt-2 text-2xl font-semibold">Where your privacy stands</h2></div><BarChart3 size={20} className="text-[#40766a]" /></div><div className="mt-7 grid gap-x-7 gap-y-5 sm:grid-cols-2">{assessment.categoryScores.map((category) => <div key={category.category} data-testid={`category-score-${category.category}`}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{category.category}</span><span className="text-[#66807d]">{Math.round(category.score)}</span></div><div className="h-2 rounded-full bg-[#e7e0d4]"><div className={`h-full rounded-full ${category.score >= 75 ? 'bg-[#6e9c89]' : category.score >= 50 ? 'bg-[#d0a258]' : 'bg-[#bd7b57]'}`} style={{ width: `${category.score}%` }} /></div></div>)}</div></section>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-2xl border border-[#ded6c8] bg-[#fbf9f4] p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="eyebrow text-[#9b6d2f]">What stood out</p><h2 className="display-font mt-2 text-2xl font-semibold">Findings to keep close</h2></div><span className="rounded-full bg-[#f4e6c7] px-3 py-1 text-xs text-[#916323]">{assessment.findings.length} findings</span></div><div className="mt-6 space-y-3">{assessment.findings.slice(0, 6).map((finding) => <div key={finding.id} className="rounded-xl border border-[#e7dfd1] p-4" data-testid={`finding-${finding.id}`}><div className="flex items-start gap-3"><span className={`mt-0.5 rounded-full p-1.5 ${finding.severity === 'immediate' ? 'bg-[#f2ddd0] text-[#a3513d]' : finding.severity === 'important' ? 'bg-[#f4e6c7] text-[#916323]' : 'bg-[#dcebe2] text-[#356c57]'}`}>{finding.severity === 'good_practice' ? <Check size={14} /> : <AlertTriangle size={14} />}</span><div><p className="text-sm font-semibold">{finding.title}</p><p className="mt-1 text-sm leading-6 text-[#66807d]">{finding.description}</p></div></div></div>)}</div></section>
      <section className="rounded-2xl border border-[#ded6c8] bg-[#e9f0eb] p-6 sm:p-8"><p className="eyebrow text-[#40766a]">Your next moves</p><h2 className="display-font mt-2 text-2xl font-semibold">Recommendations with a reason</h2><div className="mt-6 space-y-4">{assessment.recommendations.slice(0, 5).map((recommendation) => <div key={recommendation.id} className="flex gap-3" data-testid={`recommendation-${recommendation.id}`}><span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#40766a] text-xs text-white"><Check size={13} /></span><div><p className="text-sm font-semibold">{recommendation.title}</p><p className="mt-1 text-sm leading-6 text-[#5d7470]">{recommendation.detail}</p></div></div>)}</div></section>
    </div>
    <section className="mt-6 rounded-3xl border border-[#ded6c8] bg-[#fbf9f4] p-6 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow text-[#9b6d2f]">Improvement simulator</p><h2 className="display-font mt-2 text-2xl font-semibold">See the value of small changes.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66807d]">Choose actions to preview a safer score. Nothing here changes your saved report.</p></div><span className="flex items-center gap-2 rounded-full bg-[#f1eee6] px-3 py-1.5 text-xs text-[#66807d]"><Sparkles size={14} /> Not saved</span></div>{!input && <div className="mt-5 rounded-xl border border-[#e2cda8] bg-[#fbf3df] p-4 text-sm text-[#765629]" data-testid="status-simulator-unavailable">Simulator actions become available in the same session as your review. Your report remains complete.</div>}<div className="mt-7 grid gap-3 sm:grid-cols-2">{improvements.map((item) => <button type="button" key={item.key} disabled={!input || simulate.isPending} onClick={() => toggle(item.key)} data-testid={`button-improvement-${item.key}`} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${selected.includes(item.key) ? 'border-[#40766a] bg-[#e5f0ed]' : 'border-[#e0d8ca] bg-[#fffdf8] hover:border-[#aebfb7]'} disabled:cursor-not-allowed disabled:opacity-55`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected.includes(item.key) ? 'border-[#40766a] bg-[#40766a] text-white' : 'border-[#cfc5b5]'}`}>{selected.includes(item.key) && <Check size={13} />}</span><span><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-xs leading-5 text-[#7d8e8a]">{item.detail}</span></span></button>)}</div><div className="mt-7 flex flex-col items-start gap-4 rounded-2xl bg-[#19343a] p-5 text-[#f7f2e8] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-[#c6d3cd]">Preview {selected.length ? `${selected.length} selected change${selected.length === 1 ? '' : 's'}` : 'a few changes'}</p>{simulate.data && <p className="display-font mt-1 text-2xl font-semibold" data-testid="text-simulation-result">{Math.round(simulate.data.currentScore)} → {Math.round(simulate.data.newScore)} <span className="text-sm font-normal text-[#d7a85f]">(-{Math.round(simulate.data.reduction)} points risk)</span></p>}</div><button type="button" disabled={!input || !selected.length || simulate.isPending} onClick={() => input && simulate.mutate({ data: { assessment: input, improvements: selected } })} data-testid="button-run-simulation" className="inline-flex items-center gap-2 rounded-xl bg-[#d7a85f] px-4 py-3 text-sm font-semibold text-[#19343a] disabled:cursor-not-allowed disabled:opacity-50">{simulate.isPending ? 'Calculating…' : 'Simulate safer settings'} <ArrowRight size={16} /></button></div></section>
  </Shell>;
}

function ChecklistPage() {
  const checklistQuery = useGetPrivacyChecklist({ query: { queryKey: getGetPrivacyChecklistQueryKey() } });
  const items = checklistQuery.data?.items ?? fallbackChecklist;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setChecked((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const grouped = Array.from(new Set(items.map((item) => item.category)));
  return <Shell><SectionHeading eyebrow="Action checklist" title="Small changes, kept in one place." detail="Print this page or use it as a simple companion while you review your social settings. It is guidance, not a record of your accounts." action={<button type="button" onClick={() => window.print()} data-testid="button-print-checklist" className="inline-flex items-center gap-2 rounded-xl border border-[#cfc5b5] bg-[#fbf9f4] px-4 py-3 text-sm font-semibold text-[#385d5d] hover:bg-[#f0eadf]"><FileDown size={16} /> Print checklist</button>} />
    {checklistQuery.isError && <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#e2cda8] bg-[#fbf3df] px-4 py-3 text-sm text-[#765629]" data-testid="status-checklist-preview"><CircleHelp size={16} /> Showing the essential checklist while the service responds.</div>}
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-3xl border border-[#ded6c8] bg-[#fbf9f4] p-6 sm:p-8"><div className="flex items-center justify-between border-b border-[#e7dfd1] pb-5"><div><p className="eyebrow text-[#66807d]">Your progress</p><h2 className="display-font mt-2 text-2xl font-semibold">Privacy tune-up</h2></div><span className="display-font text-3xl font-semibold text-[#40766a]" data-testid="text-checklist-progress">{checked.size}/{items.length}</span></div><div className="mt-6 space-y-7">{grouped.map((category) => <div key={category}><p className="eyebrow text-[#9b6d2f]">{category}</p><div className="mt-3 space-y-2">{items.filter((item) => item.category === category).map((item) => <button type="button" key={item.id} onClick={() => toggle(item.id)} data-testid={`button-checklist-${item.id}`} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${checked.has(item.id) ? 'border-[#9bc0b0] bg-[#e9f2ed]' : 'border-[#e7dfd1] bg-[#fffdf8] hover:border-[#b7c8c0]'}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked.has(item.id) ? 'border-[#40766a] bg-[#40766a] text-white' : 'border-[#cfc5b5]'}`}>{checked.has(item.id) && <Check size={13} />}</span><span className={`text-sm leading-6 ${checked.has(item.id) ? 'text-[#40766a] line-through decoration-[#9bc0b0]' : 'text-[#385d5d]'}`}>{item.label}</span></button>)}</div></div>)}</div></section>
      <div className="space-y-6"><section className="rounded-3xl bg-[#19343a] p-6 text-[#f7f2e8] sm:p-8"><p className="eyebrow text-[#d7a85f]">A useful order</p><h2 className="display-font mt-2 text-2xl font-semibold">Start with access.</h2><p className="mt-3 text-sm leading-7 text-[#c6d3cd]">If time is short, protect the account first. Then reduce the clues that make you easy to find, profile, or impersonate.</p><div className="mt-7 space-y-4">{['Account security', 'Audience and contact details', 'Location and historical posts', 'Tags, apps, and messages'].map((label, index) => <div key={label} className="flex gap-3"><span className="display-font flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2d5459] text-sm text-[#d7a85f]">0{index + 1}</span><p className="pt-1 text-sm text-[#d7e1dc]">{label}</p></div>)}</div></section><section className="rounded-2xl border border-[#ded6c8] bg-[#fbf9f4] p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#e7efeb] p-2 text-[#40766a]"><ShieldCheck size={18} /></span><div><p className="text-sm font-semibold">Report guidance</p><p className="text-xs text-[#7d8e8a]">Keep your result useful and private.</p></div></div><ul className="mt-5 space-y-3 text-sm leading-6 text-[#5d7470]"><li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-[#40766a]" /> Save only the score and next steps if you need a reminder.</li><li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-[#40766a]" /> Do not add usernames, screenshots, or account identifiers.</li><li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-[#40766a]" /> Revisit the list after major platform or life changes.</li></ul></section></div>
    </div>
  </Shell>;
}

function LoadingBlock({ label }: { label: string }) {
  return <div className="mx-auto max-w-2xl rounded-3xl border border-[#ded6c8] bg-[#fbf9f4] p-10 text-center" data-testid="status-loading"><div className="mx-auto h-12 w-12 animate-pulse-soft rounded-2xl bg-[#dce9e5]" /><p className="mt-6 text-sm text-[#66807d]">{label}</p></div>;
}
function ErrorBlock({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) {
  return <div className="mx-auto max-w-2xl rounded-3xl border border-[#e1b9ac] bg-[#fbf1ed] p-10 text-center" data-testid="status-error"><AlertTriangle className="mx-auto text-[#a3513d]" size={30} /><h1 className="display-font mt-5 text-3xl font-semibold">{title}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8e655a]">{detail}</p><Link href={href} data-testid="link-error-action" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#19343a] px-5 py-3 text-sm font-semibold text-[#f7f2e8]">{action} <ArrowRight size={16} /></Link></div>;
}

function Router() {
  return <ErrorBoundary resetKey={useLocation()[0]}><Switch><Route path="/" component={Home} /><Route path="/assessment" component={AssessmentPage} /><Route path="/results/:id" component={ResultsPage} /><Route path="/checklist" component={ChecklistPage} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;