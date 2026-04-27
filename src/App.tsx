import { useState, useCallback } from 'react';
import { Loader as Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, TrendingUp, Settings2, Users, History, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from './hooks/useAuth';
import { useTenant } from './hooks/useTenant';
import { useProjects, useProjectData } from './hooks/useProject';

import LandingPage from './components/auth/LandingPage';
import SignIn from './components/auth/SignIn';
import Register from './components/auth/Register';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AIAgentSlideOut from './components/AIAgentSlideOut';
import ShareModal from './components/modals/ShareModal';
import ProfileModal from './components/modals/ProfileModal';

import ProjectSummaryTab from './components/tabs/ProjectSummaryTab';
import FinancialSummaryTab from './components/tabs/FinancialSummaryTab';
import PricingScenariosTab from './components/tabs/PricingScenariosTab';
import ResourcePlanningTab from './components/tabs/ResourcePlanningTab';
import ChangeHistoryTab from './components/tabs/ChangeHistoryTab';
import ProjectsAndPOsTab from './components/tabs/ProjectsAndPOsTab';

import RateCardTab from './components/settings/RateCardTab';
import CountriesTab from './components/settings/CountriesTab';
import PhasesTab from './components/settings/PhasesTab';

import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import TemplatesManager from './components/admin/TemplatesManager';
import AIAgentSettings from './components/admin/AIAgentSettings';

import { calcMarginPercent } from './lib/formatting';

type AuthMode = 'landing' | 'signin' | 'register';
type ActiveView =
  | { type: 'project'; projectId: string }
  | { type: 'settings'; tab: 'rates' | 'countries' | 'phases' }
  | { type: 'admin'; tab: 'dashboard' | 'users' | 'metadata' | 'templates' | 'ai' };

export default function App() {
  const auth = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('landing');
  const [activeView, setActiveView] = useState<ActiveView | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const tenantId = auth.profile?.tenant_id ?? null;
  const userId = auth.user?.id ?? null;

  const { settings, refreshSettings } = useTenant(tenantId);
  const { projects, sharedProjects, createProject, deleteProject, refresh: refreshProjects } = useProjects(userId, tenantId);

  const activeProjectId = activeView?.type === 'project' ? activeView.projectId : null;
  const projectHook = useProjectData(activeProjectId);
  const { data: projectData, saving } = projectHook;

  // Derived values for active project
  const totalResourceCost = projectData?.resourcePlan.reduce((s, e) => s + e.total_cost, 0) ?? 0;
  const totalResourcePrice = projectData?.resourcePlan.reduce((s, e) => s + e.total_price, 0) ?? 0;
  const basePrice = projectData?.financialItems.reduce((s, i) => s + i.price, 0) ?? totalResourcePrice;
  const baseCost = projectData?.financialItems.reduce((s, i) => s + i.cost, 0) ?? totalResourceCost;
  const currency = projectData?.summary?.currency ?? 'USD';

  const handleNewProject = useCallback(async () => {
    if (!tenantId || !userId) return;
    const project = await createProject(tenantId, userId, 'New Project');
    if (project) {
      setActiveView({ type: 'project', projectId: project.id });
      setActiveTab('summary');
    }
  }, [tenantId, userId, createProject]);

  const handleDeleteProject = useCallback(async (id: string) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    await deleteProject(id);
    if (activeProjectId === id) setActiveView(null);
  }, [deleteProject, activeProjectId]);

  async function handleSignIn(email: string, password: string) {
    await auth.signIn(email, password);
  }

  async function handleRegister(email: string, password: string, firstName: string, lastName: string, company: string) {
    await auth.signUp(email, password, firstName, lastName, company);
  }

  // Loading state
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated views
  if (!auth.user || !auth.profile) {
    if (authMode === 'signin') {
      return (
        <SignIn
          onSignIn={handleSignIn}
          onGoogleSignIn={auth.signInWithGoogle}
          onRegister={() => setAuthMode('register')}
          onBack={() => setAuthMode('landing')}
        />
      );
    }
    if (authMode === 'register') {
      return (
        <Register
          onRegister={handleRegister}
          onGoogleSignIn={auth.signInWithGoogle}
          onSignIn={() => setAuthMode('signin')}
          onBack={() => setAuthMode('landing')}
        />
      );
    }
    return (
      <LandingPage
        onSignIn={() => setAuthMode('signin')}
        onRegister={() => setAuthMode('register')}
      />
    );
  }

  // After auth — profile must be set for Google sign-in that doesn't have a profile yet
  if (!auth.profile.tenant_id) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  const isAdmin = auth.profile.role === 'admin';

  // Active project info
  const allProjects = [...projects, ...sharedProjects];
  const activeProject = allProjects.find((p) => p.id === activeProjectId);

  // Build project context for AI
  const aiProjectContext = projectData ? {
    summary: projectData.summary,
    financialItems: projectData.financialItems,
    resourcePlan: projectData.resourcePlan,
    pricingScenarios: projectData.pricingScenarios,
  } : {};

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        sharedProjects={sharedProjects}
        activeView={activeView}
        isAdmin={isAdmin}
        collapsed={sidebarCollapsed}
        profile={auth.profile}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectProject={(id) => { setActiveView({ type: 'project', projectId: id }); setActiveTab('summary'); }}
        onNewProject={handleNewProject}
        onDeleteProject={handleDeleteProject}
        onSelectSettings={(tab) => setActiveView({ type: 'settings', tab })}
        onSelectAdmin={(tab) => setActiveView({ type: 'admin', tab })}
        onProfile={() => setShowProfile(true)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          profile={auth.profile}
          activeProjectName={activeProject?.name}
          saving={saving}
          collaborators={[]}
          onShare={() => setShowShare(true)}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* No active view */}
            {!activeView && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome to SPW</h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Select a project from the sidebar or create a new one to get started.
                  </p>
                  <button
                    onClick={handleNewProject}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create New Project
                  </button>
                </div>
              </motion.div>
            )}

            {/* Admin views */}
            {activeView?.type === 'admin' && (
              <motion.div
                key={`admin-${activeView.tab}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeView.tab === 'dashboard' && <AdminDashboard tenantId={tenantId!} />}
                {activeView.tab === 'users' && <UserManagement tenantId={tenantId!} currentUserId={userId!} />}
                {activeView.tab === 'metadata' && (
                  <div className="space-y-8">
                    <CountriesTab tenantId={tenantId!} countries={settings.countries} onUpdated={refreshSettings} />
                    <PhasesTab tenantId={tenantId!} phases={settings.phases} onUpdated={refreshSettings} />
                  </div>
                )}
                {activeView.tab === 'templates' && (
                  <TemplatesManager templates={settings.templates} onUpdated={refreshSettings} />
                )}
                {activeView.tab === 'ai' && (
                  <AIAgentSettings tenantId={tenantId!} settings={settings.aiAgentSettings} onUpdated={refreshSettings} />
                )}
              </motion.div>
            )}

            {/* Settings views */}
            {activeView?.type === 'settings' && (
              <motion.div
                key={`settings-${activeView.tab}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeView.tab === 'rates' && (
                  <RateCardTab tenantId={tenantId!} rateCard={settings.rateCard} countries={settings.countries} onUpdated={refreshSettings} />
                )}
                {activeView.tab === 'countries' && (
                  <CountriesTab tenantId={tenantId!} countries={settings.countries} onUpdated={refreshSettings} />
                )}
                {activeView.tab === 'phases' && (
                  <PhasesTab tenantId={tenantId!} phases={settings.phases} onUpdated={refreshSettings} />
                )}
              </motion.div>
            )}

            {/* Project views */}
            {activeView?.type === 'project' && (
              <motion.div
                key={`project-${activeProjectId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {projectHook.loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    {/* Tab bar — flat underline style, sticky on scroll */}
                    <div className="bg-white border border-gray-200 rounded-xl mb-5 sticky top-0 z-20">
                      <TabsList className="flex bg-transparent p-0 h-auto w-full">
                        {[
                          { value: 'summary', icon: FileText, label: 'Project Summary' },
                          { value: 'resources', icon: Users, label: 'Resource Planning' },
                          { value: 'financials', icon: TrendingUp, label: 'Financial Summary' },
                          { value: 'scenarios', icon: Settings2, label: 'Pricing Scenarios' },
                          { value: 'history', icon: History, label: 'Change History' },
                          { value: 'pos', icon: Briefcase, label: 'Projects & POs' },
                        ].map((tab) => (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex items-center justify-center gap-1.5 flex-1 min-w-0 px-2 py-3.5 text-sm text-gray-500 font-medium transition-all rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-gray-900 data-[state=active]:font-semibold hover:text-gray-700 hover:bg-gray-50 first:rounded-tl-xl last:rounded-tr-xl"
                          >
                            <tab.icon className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                            <span className="truncate">{tab.label}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    <TabsContent value="summary">
                      <ProjectSummaryTab
                        summary={projectData?.summary ?? null}
                        countries={settings.countries}
                        templates={settings.templates}
                        tenantId={tenantId!}
                        onSave={projectHook.saveProjectSummary}
                        onTemplatesUpdated={refreshSettings}
                        onRenameProject={(name) => {
                          if (activeProjectId) {
                            projectHook.renameProject(activeProjectId, name);
                            refreshProjects();
                          }
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="resources">
                      <ResourcePlanningTab
                        projectId={activeProjectId!}
                        resourcePlan={projectData?.resourcePlan ?? []}
                        resourceAllocations={projectData?.resourceAllocations ?? []}
                        phaseAllocations={projectData?.phaseAllocations ?? []}
                        rateCard={settings.rateCard}
                        phases={settings.phases}
                        countries={settings.countries}
                        currency={currency}
                        startDate={projectData?.summary?.start_date ?? null}
                        endDate={projectData?.summary?.end_date ?? null}
                        onSave={projectHook.saveResourcePlan}
                      />
                    </TabsContent>

                    <TabsContent value="financials">
                      <FinancialSummaryTab
                        financialSummary={projectData?.financialSummary ?? null}
                        financialItems={projectData?.financialItems ?? []}
                        paymentMilestones={projectData?.paymentMilestones ?? []}
                        projectId={activeProjectId!}
                        currency={currency}
                        onSaveFinancialSummary={projectHook.saveFinancialSummary}
                        onSaveFinancialItems={projectHook.saveFinancialItems}
                        onSavePaymentMilestones={projectHook.savePaymentMilestones}
                      />
                    </TabsContent>

                    <TabsContent value="scenarios">
                      <PricingScenariosTab
                        scenarios={projectData?.pricingScenarios ?? []}
                        projectId={activeProjectId!}
                        currency={currency}
                        basePrice={basePrice}
                        baseCost={baseCost}
                        onSave={projectHook.savePricingScenarios}
                      />
                    </TabsContent>

                    <TabsContent value="history">
                      <ChangeHistoryTab
                        projectId={activeProjectId!}
                        history={projectData?.changeHistory ?? []}
                        currency={currency}
                        currentPrice={basePrice}
                        currentCost={baseCost}
                        currentMargin={calcMarginPercent(basePrice, baseCost)}
                        currentPricingStage={projectData?.summary?.pricing_stage ?? ''}
                        currentPricingType={projectData?.summary?.pricing_type ?? ''}
                        authorName={`${auth.profile.first_name} ${auth.profile.last_name}`}
                        onSave={projectHook.saveChangeHistory}
                      />
                    </TabsContent>

                    <TabsContent value="pos">
                      <ProjectsAndPOsTab
                        projectId={activeProjectId!}
                        pos={projectData?.projectPOs ?? []}
                        currency={currency}
                        onSave={projectHook.saveProjectPOs}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* AI Agent */}
      <AIAgentSlideOut
        aiSettings={settings.aiAgentSettings}
        projectData={aiProjectContext}
      />

      {/* Modals */}
      {showShare && activeProject && (
        <ShareModal
          open={showShare}
          onClose={() => setShowShare(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
          ownerEmail={auth.profile.email}
        />
      )}

      {showProfile && auth.profile && (
        <ProfileModal
          open={showProfile}
          onClose={() => setShowProfile(false)}
          profile={auth.profile}
          onUpdated={auth.refreshProfile}
          onSignOut={auth.signOut}
        />
      )}
    </div>
  );
}
