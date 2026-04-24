/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, ReactNode, MouseEvent, useCallback, useRef } from 'react';
import { recalculateEntry } from './lib/calculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Calculator, 
  FileText, 
  TrendingUp, 
  History, 
  Briefcase, 
  Settings2, 
  Users, 
  CreditCard, 
  LogIn, 
  LogOut, 
  Save, 
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
  Folder,
  FolderPlus,
  Trash2,
  LifeBuoy,
  ChevronRight,
  Clock,
  Play,
  Eye,
  CheckCircle,
  XCircle,
  Menu,
  X,
  Globe,
  Layers,
  Shield,
  BarChart3,
  LayoutTemplate,
  Share2,
  UserPlus,
  Bot
} from 'lucide-react';
import { SPWData, GlobalSettings, ProjectShare, ProjectPresence } from './types';
import { logActivity } from './lib/activity';
import ProjectSummaryTab from './components/ProjectSummaryTab';
import FinancialSummaryTab from './components/FinancialSummaryTab';
import PricingScenariosTab from './components/PricingScenariosTab';
import ChangeHistoryTab from './components/ChangeHistoryTab';
import ProjectsAndPOsTab from './components/ProjectsAndPOsTab';
import ProfileModal from './components/ProfileModal';
import ShareModal from './components/ShareModal';
import AIAgentSlideOut from './components/AIAgentSlideOut';

import ResourcePlanningTab from './components/ResourcePlanningTab';
import RateCardTab from './components/RateCardTab';
import PhasesSettingsTab from './components/PhasesSettingsTab';
import AdminTab from './components/AdminTab';

import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer, updateDoc, collection, query, where, deleteDoc, deleteField, collectionGroup, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import SignIn from './components/Auth/SignIn';
import Register from './components/Auth/Register';
import LandingPage from './components/Auth/LandingPage';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const INITIAL_GLOBAL_SETTINGS: GlobalSettings = {
  rateCard: [
    { id: '1', role: 'Developer', country: 'USA', currency: 'USD', costRate: 50, billRate: 100 },
    { id: '2', role: 'Designer', country: 'USA', currency: 'USD', costRate: 40, billRate: 80 },
  ],
  countries: [
    { id: '1', name: 'USA', currency: 'USD' },
    { id: '2', name: 'UK', currency: 'GBP' },
  ],
  phases: [
    { id: '1', name: 'Prepare', color: '#94A3B8' },
    { id: '2', name: 'Plan', color: '#3B82F6' },
    { id: '3', name: 'Architect', color: '#8B5CF6' },
    { id: '4', name: 'Construct', color: '#10B981' },
    { id: '5', name: 'Validate', color: '#F59E0B' },
    { id: '6', name: 'Deploy', color: '#EF4444' },
    { id: '7', name: 'Hypercare', color: '#EC4899' },
  ],
  templates: [],
};

const INITIAL_DATA: SPWData = {
  projectSummary: {
    opportunity: '',
    account: '',
    country: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    duration: 0,
    commercials: 'Time & Materials',
    currency: 'USD',
    exchangeRate: 1,
    regionalLead: '',
    regionalServicesLead: '',
    successPartner: '',
    engagementManager: '',
    projectManager: '',
    pricingStage: 'Draft',
    pricingType: '',
    opportunityLink: '',
  },
  financialSummary: {
    items: [
      { id: '1', description: 'Resources', price: 0, cost: 0, margin: 0, discount: 0 },
      { id: '4', description: 'Risk', price: 0, cost: 0, margin: 0, discount: 0 },
      { id: '5', description: 'Scenario Adjustment', price: 0, cost: 0, margin: 0, discount: 0 },
    ],
    riskScore: 0,
    riskLevel: 'Low',
    fyCostAdjustment: 0,
  },
  pricingScenarios: [
    { use: true, adjustment: 'Original Price', price: 0, cost: 0, margin: 0, discountPercent: 0, contingencyPercent: 0, isLocked: true },
    { use: false, adjustment: '10% Discount', price: 0, cost: 0, margin: 0, discountPercent: 10, contingencyPercent: 0 },
    { use: false, adjustment: 'Aggressive (35% Margin)', price: 0, cost: 0, margin: 0, discountPercent: 0, contingencyPercent: 0, targetMarginPercent: 35 },
    { use: false, adjustment: 'Conservative (+15% Risk)', price: 0, cost: 0, margin: 0, discountPercent: 0, contingencyPercent: 15 },
  ],
  changeHistory: [],
  projectsAndPOs: [],
  resourcePlan: [
    {
      id: 'default-1',
      role: '',
      country: '',
      weeks: 0,
      hoursPerWeek: 0,
      totalCost: 0,
      totalPrice: 0,
      dailyAllocation: {},
      weeklyAllocation: {},
    }
  ],
  phaseAllocation: {},
};

export default function App() {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [projects, setProjects] = useState<Record<string, { name: string, data: SPWData }>>({
    'default': { name: 'New Project', data: INITIAL_DATA }
  });
  const [sharedProjects, setSharedProjects] = useState<Record<string, { name: string, data: SPWData, isShared?: boolean, permission?: string }>>({});
  const sharedProjectUnsubscribes = useRef<Record<string, () => void>>({});
  const [baseGlobalSettings, setBaseGlobalSettings] = useState<GlobalSettings>(INITIAL_GLOBAL_SETTINGS);
  const [userGlobalSettings, setUserGlobalSettings] = useState<Partial<GlobalSettings>>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'app' | 'landing'>('landing');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('dashboard');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAIAgentOpen, setIsAIAgentOpen] = useState(false);
  const [activePresences, setActivePresences] = useState<ProjectPresence[]>([]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const lastSavedData = useRef<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const globalSettings = useMemo(() => {
    return {
      ...INITIAL_GLOBAL_SETTINGS,
      ...baseGlobalSettings,
      ...userGlobalSettings,
      rateCard: userGlobalSettings.rateCard?.length ? userGlobalSettings.rateCard : (baseGlobalSettings.rateCard?.length ? baseGlobalSettings.rateCard : INITIAL_GLOBAL_SETTINGS.rateCard),
      countries: userGlobalSettings.countries?.length ? userGlobalSettings.countries : (baseGlobalSettings.countries?.length ? baseGlobalSettings.countries : INITIAL_GLOBAL_SETTINGS.countries),
      phases: userGlobalSettings.phases?.length ? userGlobalSettings.phases : (baseGlobalSettings.phases?.length ? baseGlobalSettings.phases : INITIAL_GLOBAL_SETTINGS.phases),
      templates: userGlobalSettings.templates || baseGlobalSettings.templates || INITIAL_GLOBAL_SETTINGS.templates
    };
  }, [baseGlobalSettings, userGlobalSettings]);

  const activeProject = (activeProjectId && (projects[activeProjectId] || sharedProjects[activeProjectId])) || { name: 'New Project', data: INITIAL_DATA };
  const isShared = !!sharedProjects[activeProjectId];
  const permission = isShared ? (sharedProjects[activeProjectId] as any).permission : 'edit';
  console.log('activeProjectId:', activeProjectId);
  console.log('activeProject:', activeProject);
  const data = activeProject?.data || INITIAL_DATA;
  console.log('data:', data);

  const setData = (newData: SPWData) => {
    const account = newData.projectSummary.account;
    const opportunity = newData.projectSummary.opportunity;
    
    // Auto-generate project name from Account and Opportunity
    let newName = activeProject.name;
    if (account || opportunity) {
      newName = [account, opportunity].filter(Boolean).join(' - ');
    }

    // Sync "Original Price" scenario with Resource Plan totals directly
    const planTotals = newData.resourcePlan.reduce((acc, curr) => ({
      price: acc.price + (curr.totalPrice || 0),
      cost: acc.cost + (curr.totalCost || 0)
    }), { price: 0, cost: 0 });

    if (newData.pricingScenarios && newData.pricingScenarios.length > 0) {
      const firstScenario = newData.pricingScenarios[0];
      if (firstScenario.adjustment === 'Original Price' || firstScenario.adjustment === 'Baseline Plan' || firstScenario.isLocked) {
        // We mutate a copy of the scenarios array to avoid direct state mutation
        const updatedScenarios = [...newData.pricingScenarios];
        updatedScenarios[0] = {
          ...firstScenario,
          price: planTotals.price,
          cost: planTotals.cost,
          margin: planTotals.price > 0 ? ((planTotals.price - planTotals.cost) / planTotals.price) * 100 : 0
        };
        
        // Also update other scenarios if they are dependent on baseline
        for (let i = 1; i < updatedScenarios.length; i++) {
          const s = updatedScenarios[i];
          let cost = updatedScenarios[0].cost;
          let price = updatedScenarios[0].price;

          if (s.contingencyPercent) cost = updatedScenarios[0].cost * (1 + s.contingencyPercent / 100);
          if (s.discountPercent) price = updatedScenarios[0].price * (1 - s.discountPercent / 100);
          if (s.targetMarginPercent && s.targetMarginPercent > 0) {
            price = cost / (1 - s.targetMarginPercent / 100);
          }

          updatedScenarios[i] = {
            ...s,
            cost,
            price,
            margin: price > 0 ? ((price - cost) / price) * 100 : 0
          };
        }
        
        newData.pricingScenarios = updatedScenarios;
      }
    }

    if (sharedProjects[activeProjectId]) {
      setSharedProjects(prev => ({
        ...prev,
        [activeProjectId]: { ...prev[activeProjectId], name: newName, data: newData }
      }));
    } else {
      setProjects(prev => ({
        ...prev,
        [activeProjectId]: { 
          ...prev[activeProjectId], 
          name: newName,
          data: newData 
        }
      }));
    }
  };

  const handleCreateProject = async () => {
    if (!user) return;
    const newId = Date.now().toString();
    const newProject = {
      id: newId,
      name: 'New Project',
      ownerId: user.uid,
      ownerEmail: user.email,
      data: INITIAL_DATA,
      sharedWith: {},
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'projects', newId), newProject);
      setActiveProjectId(newId);
      
      logActivity(
        'project_created',
        `Created new project: New Project`,
        user.uid,
        user.displayName || user.email || 'Unknown User',
        { projectId: newId }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${newId}`);
    }
  };

  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleDeleteProject = (id: string, e: any) => {
    e.stopPropagation(); // Prevent switching project
    if (Object.keys(projects).length <= 1) {
      alert("Cannot delete the last project.");
      return;
    }
    setProjectToDelete(id);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete && user) {
      const project = projects[projectToDelete] || sharedProjects[projectToDelete];
      const projectName = project?.name || 'Unknown Project';
      
      try {
        if (sharedProjects[projectToDelete]) {
          // If it's a shared project, just remove the share for this user
          if (user.email) {
            const shareRef = doc(db, 'projects', projectToDelete, 'shares', user.email.toLowerCase());
            await deleteDoc(shareRef);
          }
        } else {
          // If owner, delete the whole project
          await deleteDoc(doc(db, 'projects', projectToDelete));
        }

        logActivity(
          'project_deleted',
          `Deleted project: ${projectName}`,
          user.uid,
          user.displayName || user.email || 'Unknown User',
          { projectId: projectToDelete }
        );
        
        if (activeProjectId === projectToDelete) {
          setActiveProjectId('default');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `projects/${projectToDelete}`);
      }
      setProjectToDelete(null);
    }
  };

  const handleSwitchProject = (id: string) => {
    setActiveProjectId(id);
    if (activeTab === 'admin') {
      setActiveTab('summary');
    }
  };

  // Derived admin state for robustness
  const isSystemAdmin = useMemo(() => {
    if (!user) return false;
    if (user.email === 'john.vu@crosscloudpartners.com') return false;
    const isEmergencyAdmin = user.email === 'support@crosscloudpartners.com';
    return isEmergencyAdmin || userProfile?.role === 'admin';
  }, [user, userProfile]);

  useEffect(() => {
    if (!isSystemAdmin && activeTab === 'admin') {
      setActiveTab('summary');
    }
  }, [isSystemAdmin, activeTab]);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setError(`Database error (${operationType}): ${errInfo.error}`);
  };

  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          setError("Database is offline. Please check your connection or configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setAuthMode('app');
        setError(null); // Clear any previous auth errors
        
        // Check if user is a system admin
        const isEmergencyAdmin = u.email === 'support@crosscloudpartners.com';
        if (isEmergencyAdmin) {
          setActiveTab('admin');
          setAdminSubTab('dashboard');
        }

        // Check if user profile exists in Firestore
        try {
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            // If it's a Google user and profile doesn't exist, create a basic one
            const isFirstAdmin = u.email === 'support@crosscloudpartners.com';
            if (u.providerData.some(p => p.providerId === 'google.com')) {
              await setDoc(userRef, {
                uid: u.uid,
                firstName: u.displayName?.split(' ')[0] || 'User',
                lastName: u.displayName?.split(' ').slice(1).join(' ') || '',
                email: u.email || '',
                companyName: 'Individual',
                createdAt: new Date().toISOString(),
                role: isFirstAdmin ? 'admin' : 'user',
                lastLogin: new Date().toISOString(),
                photoURL: u.photoURL || null
              });
              
              if (u.email) {
                try {
                  await setDoc(doc(db, 'public_profiles', u.email.toLowerCase()), {
                    uid: u.uid,
                    firstName: u.displayName?.split(' ')[0] || 'User',
                    lastName: u.displayName?.split(' ').slice(1).join(' ') || '',
                    photoURL: u.photoURL || null,
                  }, { merge: true });
                } catch(e) {}
              }
            }
          } else {
            const profile = userSnap.data();
            
            // Only update last login if it hasn't been updated in the last 24 hours
            const lastLoginDate = profile.lastLogin ? new Date(profile.lastLogin) : new Date(0);
            const now = new Date();
            const hoursSinceLastLogin = (now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastLogin > 24 || profile.photoURL !== (u.photoURL || profile.photoURL || null)) {
              // Update last login and photoURL if needed
              await updateDoc(userRef, { 
                lastLogin: now.toISOString(), 
                photoURL: u.photoURL || profile.photoURL || null 
              });
            }
            
            // Only sync public profile if data changed
            if (u.email) {
              const publicProfileRef = doc(db, 'public_profiles', u.email.toLowerCase());
              const publicProfileSnap = await getDoc(publicProfileRef);
              const publicProfileData = publicProfileSnap.exists() ? publicProfileSnap.data() : null;

              const newFirstName = profile.firstName || u.displayName?.split(' ')[0] || '';
              const newLastName = profile.lastName || u.displayName?.split(' ').slice(1).join(' ') || '';
              const newPhotoURL = profile.photoURL || u.photoURL || null;

              if (!publicProfileData || 
                  publicProfileData.firstName !== newFirstName || 
                  publicProfileData.lastName !== newLastName || 
                  publicProfileData.photoURL !== newPhotoURL) {
                try {
                  await setDoc(publicProfileRef, {
                    uid: u.uid,
                    firstName: newFirstName,
                    lastName: newLastName,
                    photoURL: newPhotoURL,
                  }, { merge: true });
                } catch(e) {
                  console.warn('Failed to sync public profile:', e);
                }
              }
            }

            // ONE-TIME BACKFILL SCRIPT
            // Removed for performance.
          }
        } catch (err) {
          console.error('Error fetching/creating user profile:', err);
        }
      } else {
        setAuthMode(prev => prev === 'app' ? 'signin' : prev);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsDataLoaded(false);
      return;
    }

    // Reset to defaults before loading new user data
    setProjects({});
    setSharedProjects({});
    setActiveProjectId('default');
    setBaseGlobalSettings(INITIAL_GLOBAL_SETTINGS);
    setUserGlobalSettings({});
    setUserProfile(null);
    setIsDataLoaded(false);

    const userProfileRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userProfileRef, async (snapshot) => {
      if (snapshot.exists()) {
        const profile = snapshot.data();
        setUserProfile(profile);
        
        const isEmergencyAdmin = user.email === 'support@crosscloudpartners.com';
        if (isEmergencyAdmin && profile.role !== 'admin') {
          try {
            await updateDoc(userProfileRef, { role: 'admin' });
          } catch (err) {
            console.error('Failed to proactively upgrade admin role:', err);
          }
        } else if (user.email === 'john.vu@crosscloudpartners.com' && profile.role === 'admin') {
          try {
            await updateDoc(userProfileRef, { role: 'user' });
          } catch (err) {
            console.error('Failed to proactively downgrade user role:', err);
          }
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });

    // Load user settings (activeProjectId, globalSettings)
    const settingsRef = doc(db, 'settings', user.uid);
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      console.log('User settings snapshot exists:', snapshot.exists());
      if (snapshot.exists()) {
        const settingsData = snapshot.data();
        console.log('User settings data:', settingsData);
        if (settingsData.globalSettings) {
          setUserGlobalSettings(settingsData.globalSettings);
        }
        if (settingsData.activeProjectId) {
          setActiveProjectId(settingsData.activeProjectId);
        }
      }
    }, (err) => {
      console.error('Error loading user settings:', err);
      handleFirestoreError(err, OperationType.GET, `settings/${user.uid}`);
    });

    // Load truly global settings
    const globalSettingsRef = doc(db, 'settings', 'global');
    const unsubscribeGlobalSettings = onSnapshot(globalSettingsRef, (snapshot) => {
      console.log('Global settings snapshot exists:', snapshot.exists());
      if (snapshot.exists()) {
        const data = snapshot.data() as GlobalSettings;
        console.log('Global settings data:', data);
        setBaseGlobalSettings(data);
      }
    }, (err) => {
      console.warn('Could not load global settings:', err);
    });

    // Load projects owned by user
    const ownedProjectsQuery = query(
      collection(db, 'projects'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeOwned = onSnapshot(ownedProjectsQuery, (snapshot) => {
      const newProjects: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        newProjects[doc.id] = doc.data();
      });
      setProjects(newProjects);
      setIsDataLoaded(true);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'projects');
    });

    // Load projects shared with user
    const userEmail = user.email?.toLowerCase();
    if (!userEmail) return;

    const sharedProjectsQuery = query(
      collectionGroup(db, 'shares'),
      where('email', '==', userEmail)
    );

    const unsubscribeShared = onSnapshot(sharedProjectsQuery, (snapshot) => {
      const newProjectIds = new Set(snapshot.docs.map(doc => doc.data().projectId));
      
      // Unsubscribe from removed projects
      Object.keys(sharedProjectUnsubscribes.current).forEach(projectId => {
        if (!newProjectIds.has(projectId)) {
          sharedProjectUnsubscribes.current[projectId]();
          delete sharedProjectUnsubscribes.current[projectId];
          setSharedProjects(prev => {
            const next = { ...prev };
            delete next[projectId];
            return next;
          });
        }
      });

      // Subscribe to new projects
      snapshot.docs.forEach(shareDoc => {
        const shareData = shareDoc.data();
        const { projectId } = shareData;
        if (!sharedProjectUnsubscribes.current[projectId]) {
          sharedProjectUnsubscribes.current[projectId] = onSnapshot(doc(db, 'projects', projectId), (projectDoc) => {
            if (projectDoc.exists()) {
              setSharedProjects(prev => ({
                ...prev,
                [projectId]: {
                  ...projectDoc.data() as SPWData,
                  isShared: true,
                  permission: shareData.permission
                }
              }));
            }
          });
        }
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'shares (collectionGroup)');
    });

    return () => {
      unsubscribeProfile();
      unsubscribeSettings();
      unsubscribeGlobalSettings();
      unsubscribeOwned();
      unsubscribeShared();
      Object.values(sharedProjectUnsubscribes.current).forEach((unsubscribe: () => void) => unsubscribe());
    };
  }, [user]);

  // Presence logic
  useEffect(() => {
    if (!user) return;

    const presenceRef = doc(db, 'presence', user.uid);
    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, {
          uid: user.uid,
          email: user.email || null,
          displayName: user.displayName || (userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : null) || 'User',
          photoURL: user.photoURL ?? userProfile?.photoURL ?? null,
          lastActive: new Date().toISOString(),
          activeProjectId: activeProjectId || 'default'
        });
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    };

    const presenceInterval = setInterval(updatePresence, 300000); // 5 minutes
    updatePresence();
    
    return () => clearInterval(presenceInterval);

    const presencesQuery = query(
      collection(db, 'presence'),
      where('activeProjectId', '==', activeProjectId),
      where('lastActive', '>', new Date(Date.now() - 360000).toISOString()) // 6 minutes
    );

    const unsubscribePresences = onSnapshot(presencesQuery, (snapshot) => {
      const presences = snapshot.docs
        .map(doc => doc.data() as ProjectPresence)
        .filter(p => p.uid !== user.uid);
      setActivePresences(presences);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'presence');
    });

    return () => {
      unsubscribePresences();
      clearInterval(presenceInterval);
      deleteDoc(presenceRef).catch(console.error);
    };
  }, [user, userProfile, activeProjectId]);

  // Ensure financial summary and pricing scenarios are synced on project load or switch
  useEffect(() => {
    if (!user || !data.resourcePlan) return;

    // Recalculate all entries to ensure totalPrice/totalCost are correct based on current rate card
    const recalculatedPlan = data.resourcePlan.map(entry => 
      recalculateEntry(entry, globalSettings.rateCard)
    );

    const totals = recalculatedPlan.reduce((acc, curr) => ({
      price: acc.price + (curr.totalPrice || 0),
      cost: acc.cost + (curr.totalCost || 0)
    }), { price: 0, cost: 0 });

    const resourceItem = data.financialSummary.items.find(i => i.description === 'Resources');
    const currentPrice = resourceItem?.price || 0;
    const currentCost = resourceItem?.cost || 0;

    // Only update if there's a mismatch to avoid unnecessary state updates
    if (Math.abs(totals.price - currentPrice) > 0.01 || Math.abs(totals.cost - currentCost) > 0.01) {
      const newFinancialItems = data.financialSummary.items.map(item => {
        if (item.description === 'Resources') {
          return { 
            ...item, 
            price: totals.price, 
            cost: totals.cost, 
            margin: totals.price > 0 ? ((totals.price - totals.cost) / totals.price) * 100 : 0 
          };
        }
        return item;
      });

      setData({
        ...data,
        resourcePlan: recalculatedPlan,
        financialSummary: {
          ...data.financialSummary,
          items: newFinancialItems
        }
      });
    }
  }, [activeProjectId, user, globalSettings.rateCard]);

  useEffect(() => {
    if (!user || !isDataLoaded) return;
    
    // Clear existing timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    const activeProject = projects[activeProjectId] || sharedProjects[activeProjectId];
    if (!activeProject || activeProjectId === 'default') return;

    const dataString = JSON.stringify(activeProject.data);
    
    // Only save if data has changed
    if (dataString === lastSavedData.current) return;

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const isShared = !!sharedProjects[activeProjectId];
        const permission = isShared ? (sharedProjects[activeProjectId] as any).permission : 'edit';
        
        if (!isShared || permission === 'edit') {
          let projectName = activeProject.name;
          if (!projectName || projectName === 'Untitled Project' || projectName === 'New Project') {
            const account = activeProject.data?.projectSummary?.account;
            const opportunity = activeProject.data?.projectSummary?.opportunity;
            if (account || opportunity) {
              projectName = [account, opportunity].filter(Boolean).join(' - ');
            } else {
              projectName = projectName || 'New Project';
            }
          }

          // Save project data
          const projectRef = doc(db, 'projects', activeProjectId);
          await updateDoc(projectRef, {
            name: projectName,
            data: activeProject.data || INITIAL_DATA,
            updatedAt: new Date().toISOString()
          });
          lastSavedData.current = dataString;
        }

        // Save user settings (always save the active project ID so it persists across reloads)
        const settingsRef = doc(db, 'settings', user.uid);
        await setDoc(settingsRef, {
          activeProjectId,
          updatedAt: new Date().toISOString()
        }, { merge: true });

      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `projects/${activeProjectId}`);
      } finally {
        setSaving(false);
      }
    }, 3000); // 3 second debounce
    
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [projects[activeProjectId], sharedProjects[activeProjectId], activeProjectId, user, isDataLoaded]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    try {
      setIsLoggingIn(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      // Add custom parameters to force account selection and ensure popup works reliably
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        logActivity(
          'login',
          `User logged in via Google`,
          result.user.uid,
          result.user.displayName || result.user.email || 'Unknown User'
        );
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Ignore popup closed by user errors
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in Firebase. Please enable it in the console.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailSignIn = async (email: string, pass: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        logActivity(
          'login',
          `User logged in via Email`,
          result.user.uid,
          result.user.displayName || result.user.email || 'Unknown User'
        );
      }
    } catch (err: any) {
      console.error('Email sign in error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled in Firebase. Please enable it in the console.');
      } else {
        setError(err.message || 'Failed to sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (formData: any) => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const newUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(newUser, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      // Create user profile in Firestore
      const isFirstAdmin = formData.email === 'support@crosscloudpartners.com';
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        companyName: formData.companyName,
        createdAt: new Date().toISOString(),
        role: isFirstAdmin ? 'admin' : 'user',
        lastLogin: new Date().toISOString()
      });

      try {
        await setDoc(doc(db, 'public_profiles', formData.email.toLowerCase()), {
          uid: newUser.uid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          photoURL: null,
        }, { merge: true });
      } catch (e) {
        console.error("Failed to write public profile:", e);
      }

      logActivity(
        'user_registered',
        `New user registered: ${formData.firstName} ${formData.lastName}`,
        newUser.uid,
        `${formData.firstName} ${formData.lastName}`,
        { email: formData.email, company: formData.companyName }
      );

      setAuthMode('app');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password registration is not enabled in Firebase. Please enable it in the console.');
      } else {
        setError(err.message || 'Failed to register.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAuthMode('signin');
      setIsDataLoaded(false);
      setProjects({
        'default': { name: 'New Project', data: INITIAL_DATA }
      });
      setActiveProjectId('default');
      setBaseGlobalSettings(INITIAL_GLOBAL_SETTINGS);
      setUserGlobalSettings({});
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to sign out.');
    }
  };

  const saveToFirebase = async (newData: SPWData) => {
    // No-op, saving is handled by useEffect
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 7));
  };

  const calculateEndDate = (start: string, durationWeeks: number) => {
    const s = start ? new Date(start) : new Date();
    if (isNaN(s.getTime())) return start;
    const e = new Date(s);
    e.setDate(s.getDate() + (durationWeeks * 7));
    return e.toISOString().split('T')[0];
  };

  const updateProjectSummary = (summary: Partial<SPWData['projectSummary']>) => {
    let updatedSummary = { ...data.projectSummary, ...summary };
    
    // Ensure we have a start date if we're calculating end date from duration
    if (!updatedSummary.startDate) {
      updatedSummary.startDate = new Date().toISOString().split('T')[0];
    }

    // Auto-calculate duration or end date
    if (summary.startDate || summary.endDate) {
      updatedSummary.duration = calculateDuration(updatedSummary.startDate, updatedSummary.endDate);
    } else if (summary.duration !== undefined) {
      updatedSummary.endDate = calculateEndDate(updatedSummary.startDate, updatedSummary.duration);
    }

    let newData = {
      ...data,
      projectSummary: updatedSummary
    };

    // ALWAYS sync resource plan weeks if duration changed OR if it's a new duration
    if (updatedSummary.duration !== data.projectSummary.duration || summary.duration !== undefined) {
      newData.resourcePlan = data.resourcePlan.map(r => {
        const updatedResource = { 
          ...r, 
          weeks: updatedSummary.duration,
          dailyAllocation: {},
          weeklyAllocation: {}
        };
        
        return recalculateEntry(updatedResource, globalSettings.rateCard);
      });

      // Recalculate financial summary totals
      const totals = newData.resourcePlan.reduce((acc, curr) => ({
        price: acc.price + curr.totalPrice,
        cost: acc.cost + curr.totalCost
      }), { price: 0, cost: 0 });

      newData.financialSummary.items = newData.financialSummary.items.map(item => {
        if (item.description === 'Resources') {
          return { 
            ...item, 
            price: totals.price, 
            cost: totals.cost, 
            margin: totals.price > 0 ? ((totals.price - totals.cost) / totals.price) * 100 : 0 
          };
        }
        return item;
      });
    }

    setData(newData);
    saveToFirebase(newData);
  };

  const STAGES = ['Draft', 'In Progress', 'In Review', 'Approved', 'Cancelled'];
  
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'Draft': return <Clock className="w-4 h-4" />;
      case 'In Progress': return <Play className="w-4 h-4" />;
      case 'In Review': return <Eye className="w-4 h-4" />;
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const StatusChevron = () => {
    const currentStage = data.projectSummary.pricingStage || 'Draft';
    
    return (
      <div className="flex items-center w-full py-6 overflow-x-auto no-scrollbar scroll-smooth snap-x px-2">
        {STAGES.map((stage, index) => {
          const isActive = currentStage === stage;
          const isPast = STAGES.indexOf(currentStage) > index && currentStage !== 'Cancelled';
          const isCancelled = currentStage === 'Cancelled' && stage === 'Cancelled';
          
          return (
            <div 
              key={stage} 
              className="flex-1 min-w-[130px] sm:min-w-[160px] snap-center relative"
              style={{ 
                marginLeft: index === 0 ? 0 : '-18px',
                zIndex: isActive || isCancelled ? 30 : 20 - index 
              }}
            >
              <button
                onClick={() => updateProjectSummary({ pricingStage: stage })}
                className={cn(
                  "relative w-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-4 sm:py-5 text-[10px] sm:text-xs font-black transition-all duration-300 uppercase tracking-widest",
                  isActive ? "bg-blue-600 text-white shadow-[0_10px_25px_-5px_rgba(37,99,235,0.5)] scale-105" : 
                  isPast ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : 
                  isCancelled ? "bg-red-600 text-white shadow-[0_10px_25px_-5px_rgba(220,38,38,0.5)] scale-105" :
                  "bg-white text-gray-400 border-y border-gray-100 hover:bg-gray-50"
                )}
                style={{
                  clipPath: index === 0 
                    ? 'polygon(0% 0%, 92% 0%, 100% 50%, 92% 100%, 0% 100%)' 
                    : index === STAGES.length - 1
                    ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 8% 50%)'
                    : 'polygon(0% 0%, 92% 0%, 100% 50%, 92% 100%, 0% 100%, 8% 50%)',
                  paddingLeft: index === 0 ? '1rem' : '2rem',
                  paddingRight: index === STAGES.length - 1 ? '1rem' : '2rem'
                }}
              >
                {/* 3D Inner Shadow effect */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-b from-white to-black/20" />
                
                {(isActive || isCancelled) && (
                  <span className="shrink-0 drop-shadow-md">{getStageIcon(stage)}</span>
                )}
                <span className="truncate drop-shadow-sm">{stage}</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const updateFinancialSummary = (summary: Partial<SPWData['financialSummary']>) => {
    const updatedFinancialSummary = { ...data.financialSummary, ...summary };
    
    const newData = {
      ...data,
      financialSummary: updatedFinancialSummary
    };
    setData(newData);
    saveToFirebase(newData);
  };

  const updatePricingScenarios = (scenarios: SPWData['pricingScenarios']) => {
    const newData = {
      ...data,
      pricingScenarios: scenarios
    };
    setData(newData);
    saveToFirebase(newData);
  };

  const addHistoryEntry = (entry: SPWData['changeHistory'][0]) => {
    const newData = {
      ...data,
      changeHistory: [entry, ...data.changeHistory]
    };
    setData(newData);
    saveToFirebase(newData);
  };

  const updateProjectsAndPOs = (pos: SPWData['projectsAndPOs']) => {
    const newData = {
      ...data,
      projectsAndPOs: pos
    };
    setData(newData);
    saveToFirebase(newData);
  };

  const updateProjectAndData = (summary: Partial<SPWData['projectSummary']>, plan: SPWData['resourcePlan']) => {
    let updatedSummary = { ...data.projectSummary, ...summary };
    
    // Ensure we have a start date if we're calculating end date from duration
    if (!updatedSummary.startDate) {
      updatedSummary.startDate = new Date().toISOString().split('T')[0];
    }

    // Auto-calculate duration or end date
    if (summary.startDate || summary.endDate) {
      updatedSummary.duration = calculateDuration(updatedSummary.startDate, updatedSummary.endDate);
    } else if (summary.duration !== undefined) {
      updatedSummary.endDate = calculateEndDate(updatedSummary.startDate, updatedSummary.duration);
    }

    // Sync resource plan weeks if duration changed
    const updatedPlan = plan.map(r => {
      const updatedResource = { ...r, weeks: updatedSummary.duration };
      return recalculateEntry(updatedResource, globalSettings.rateCard);
    });

    // Calculate totals for financial summary
    const totals = updatedPlan.reduce((acc, curr) => ({
      price: acc.price + curr.totalPrice,
      cost: acc.cost + curr.totalCost
    }), { price: 0, cost: 0 });

    const newFinancialItems = data.financialSummary.items.map(item => {
      if (item.description === 'Resources') {
        return { 
          ...item, 
          price: totals.price, 
          cost: totals.cost, 
          margin: totals.price > 0 ? ((totals.price - totals.cost) / totals.price) * 100 : 0 
        };
      }
      return item;
    });

    const newData = {
      ...data,
      projectSummary: updatedSummary,
      resourcePlan: updatedPlan,
      financialSummary: {
        ...data.financialSummary,
        items: newFinancialItems
      }
    };
    setData(newData);
    saveToFirebase(newData);
  };

  const updateResourcePlan = (plan: SPWData['resourcePlan']) => {
    // Calculate totals for financial summary
    const totals = plan.reduce((acc, curr) => ({
      price: acc.price + curr.totalPrice,
      cost: acc.cost + curr.totalCost
    }), { price: 0, cost: 0 });

    const newFinancialItems = data.financialSummary.items.map(item => {
      if (item.description === 'Resources') {
        return { 
          ...item, 
          price: totals.price, 
          cost: totals.cost, 
          margin: totals.price > 0 ? ((totals.price - totals.cost) / totals.price) * 100 : 0 
        };
      }
      return item;
    });

    const newData = {
      ...data,
      resourcePlan: plan,
      financialSummary: {
        ...data.financialSummary,
        items: newFinancialItems
      }
    };
    setData(newData);
    saveToFirebase(newData);
  };

  const updateGlobalSettings = async (updates: Partial<GlobalSettings>) => {
    if (user && isSystemAdmin) {
      const newSettings = { ...baseGlobalSettings, ...updates };
      setBaseGlobalSettings(newSettings);
      try {
        await setDoc(doc(db, 'settings', 'global'), newSettings, { merge: true });
        logActivity(
          'admin_action',
          `Updated global settings`,
          user.uid,
          user.displayName || user.email || 'System Admin'
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'settings/global');
      }
    } else if (user) {
      // For regular users, save to their own settings
      const newSettings = { ...userGlobalSettings, ...updates };
      setUserGlobalSettings(newSettings);
      try {
        await setDoc(doc(db, 'settings', user.uid), { globalSettings: newSettings }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `settings/${user.uid}`);
      }
    }
  };

  const updateRateCard = (card: GlobalSettings['rateCard']) => {
    updateGlobalSettings({ rateCard: card });
  };

  const updatePhases = (phases: GlobalSettings['phases']) => {
    updateGlobalSettings({ phases });
  };

  const updateCountries = (countries: GlobalSettings['countries']) => {
    const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
    updateGlobalSettings({ countries: sortedCountries });
  };

  const saveAsTemplate = (name: string, description: string) => {
    const newTemplate = {
      id: Date.now().toString(),
      name,
      description,
      data: JSON.parse(JSON.stringify(data))
    };
    
    updateGlobalSettings({
      templates: [...(globalSettings.templates || []), newTemplate]
    });
  };

  const deleteTemplate = (id: string) => {
    updateGlobalSettings({
      templates: (globalSettings.templates || []).filter(t => t.id !== id)
    });
  };

  const updateTemplate = (id: string, name: string, description: string, updateData: boolean = false) => {
    updateGlobalSettings({
      templates: (globalSettings.templates || []).map(t => 
        t.id === id 
          ? { 
              ...t, 
              name, 
              description, 
              data: updateData ? JSON.parse(JSON.stringify(data)) : t.data 
            } 
          : t
      )
    });
  };

  const applyTemplate = (templateId: string) => {
    const template = globalSettings.templates?.find(t => t.id === templateId);
    if (template) {
      const newData = {
        ...data,
        resourcePlan: JSON.parse(JSON.stringify(template.data.resourcePlan)),
        phaseAllocation: JSON.parse(JSON.stringify(template.data.phaseAllocation || {})),
      };
      setData(newData);
      saveToFirebase(newData);
    }
  };

  const updatePhaseAllocation = (allocation: Record<string, string>) => {
    const newData = {
      ...data,
      phaseAllocation: allocation
    };
    setData(newData);
    saveToFirebase(newData);
  };

  const handleRenameRole = (oldName: string, newName: string, updatedRateCard: GlobalSettings['rateCard']) => {
    updateGlobalSettings({ rateCard: updatedRateCard });
    
    // Update role name in all projects
    setProjects(prev => {
      const updatedProjects = { ...prev };
      Object.keys(updatedProjects).forEach(id => {
        updatedProjects[id].data.resourcePlan = updatedProjects[id].data.resourcePlan.map(r => 
          r.role === oldName ? { ...r, role: newName } : r
        );
      });
      return updatedProjects;
    });
  };

  const handleProfileUpdate = () => {
    if (auth.currentUser) {
      setUser({ ...auth.currentUser });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-blue-600 p-3 rounded-xl mb-4 shadow-lg shadow-blue-200">
          <Calculator className="w-8 h-8 text-white animate-pulse" />
        </div>
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium animate-pulse">Initializing workbook...</p>
      </div>
    );
  }

  if (authMode === 'landing' && !user) {
    return (
      <LandingPage 
        onSignIn={() => setAuthMode('signin')}
        onRegister={() => setAuthMode('register')}
      />
    );
  }

  if (authMode === 'signin' && !user) {
    return (
      <SignIn 
        onSignIn={handleEmailSignIn} 
        onGoogleSignIn={handleLogin} 
        onSwitchToRegister={() => setAuthMode('register')}
        onBackToLanding={() => setAuthMode('landing')}
      />
    );
  }

  if (authMode === 'register' && !user) {
    return (
      <Register 
        onRegister={handleEmailRegister} 
        onSwitchToSignIn={() => setAuthMode('signin')}
        onBackToLanding={() => setAuthMode('landing')}
      />
    );
  }

  return (
    <div id="app-root" className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        id="app-sidebar"
        initial={false}
        animate={{ 
          width: isSidebarCollapsed ? 64 : 240,
          x: isMobileSidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1280 ? -240 : 0)
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]",
          "fixed inset-y-0 left-0 xl:relative xl:translate-x-0"
        )}
      >
        <div className="p-4 flex items-center justify-between lg:justify-center border-b border-gray-100 h-[73px]">
          <div className="lg:hidden flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Services Pricing Workbook</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileSidebarOpen(false);
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }
            }}
            className="text-gray-400 hover:text-blue-600 shrink-0"
          >
            {window.innerWidth < 1024 ? <X className="w-5 h-5" /> : (isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />)}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {isSystemAdmin && (
            <div className="space-y-1 px-2 mb-6">
              {!isSidebarCollapsed && (
                <div className="px-4 mb-2 text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.1em]">Administration</div>
              )}
              <button 
                onClick={() => {
                  setActiveTab('admin');
                  setAdminSubTab('dashboard');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200",
                  activeTab === 'admin' && adminSubTab === 'dashboard'
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-sm" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <BarChart3 className={cn("w-4 h-4 shrink-0", activeTab === 'admin' && adminSubTab === 'dashboard' ? "text-blue-600" : "text-gray-400")} />
                {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Dashboard</span>}
              </button>
              <button 
                onClick={() => {
                  setActiveTab('admin');
                  setAdminSubTab('users');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200",
                  activeTab === 'admin' && adminSubTab === 'users'
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-sm" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Users className={cn("w-4 h-4 shrink-0", activeTab === 'admin' && adminSubTab === 'users' ? "text-blue-600" : "text-gray-400")} />
                {!isSidebarCollapsed && <span className="truncate flex-1 text-left">User Management</span>}
              </button>
              <button 
                onClick={() => {
                  setActiveTab('admin');
                  setAdminSubTab('metadata');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200",
                  activeTab === 'admin' && adminSubTab === 'metadata'
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-sm" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Settings2 className={cn("w-4 h-4 shrink-0", activeTab === 'admin' && adminSubTab === 'metadata' ? "text-blue-600" : "text-gray-400")} />
                {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Global Metadata</span>}
              </button>
              <button 
                onClick={() => {
                  setActiveTab('admin');
                  setAdminSubTab('templates');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200",
                  activeTab === 'admin' && adminSubTab === 'templates'
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-sm" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <LayoutTemplate className={cn("w-4 h-4 shrink-0", activeTab === 'admin' && adminSubTab === 'templates' ? "text-blue-600" : "text-gray-400")} />
                {!isSidebarCollapsed && <span className="truncate flex-1 text-left">Global Templates</span>}
              </button>
            </div>
          )}
          
          <div className="space-y-1 px-2">
            {!isSystemAdmin && (
              <>
                {!isSidebarCollapsed && (
                  <div className="px-4 mb-2 text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.1em]">Projects</div>
                )}
                <button 
                  onClick={handleCreateProject}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-xl",
                    isSidebarCollapsed && "justify-center px-0"
                  )}
                  title="New project"
                >
                  <FolderPlus className="w-4 h-4 text-gray-400" />
                  {!isSidebarCollapsed && <span>New project</span>}
                </button>
                {!isSidebarCollapsed && (Object.entries({ ...projects, ...sharedProjects }) as [string, { name: string, data: SPWData, isShared?: boolean, permission?: string }][]).map(([id, project]) => (
              <div key={(project.isShared ? 'shared-' : 'owned-') + id} className="group relative px-2">
                    <button 
                      onClick={() => handleSwitchProject(id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200",
                        activeProjectId === id && activeTab !== 'admin'
                          ? "bg-blue-50 text-blue-700 font-semibold shadow-sm" 
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                      title={project.name}
                    >
                      {project.isShared ? (
                        <Share2 className={cn("w-4 h-4 shrink-0", activeProjectId === id && activeTab !== 'admin' ? "text-blue-600" : "text-gray-400")} />
                      ) : (
                        <Folder className={cn("w-4 h-4 shrink-0", activeProjectId === id && activeTab !== 'admin' ? "text-blue-600" : "text-gray-400")} />
                      )}
                      <span className="truncate flex-1 text-left">
                        {project.name && project.name !== 'Untitled Project' ? project.name : (
                          [project.data?.projectSummary?.account, project.data?.projectSummary?.opportunity].filter(Boolean).join(' - ') || 'New Project'
                        )}
                      </span>
                      {project.isShared && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-100 text-blue-600 bg-blue-50/50">
                          {project.permission === 'edit' ? 'Edit' : 'Read'}
                        </Badge>
                      )}
                    </button>
                    {!project.isShared && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(id, e)}
                        className={cn(
                          "absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 transition-all duration-200",
                          "opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 pointer-events-auto"
                        )}
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>


          <div className="p-2 border-t border-gray-100 mt-auto space-y-1 relative">
            <AnimatePresence>
              {isSettingsMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={cn(
                    "absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden py-2",
                    isSidebarCollapsed && "left-1/2 -translate-x-1/2 w-48"
                  )}
                >
                  <div className="px-5 py-3 text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.1em]">Configuration</div>
                  <button 
                    onClick={() => {
                      setActiveTab('rates');
                      setIsSettingsMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 text-base transition-all duration-200",
                      activeTab === 'rates' ? "bg-[#F0F7FF] text-[#2563EB]" : "text-[#475569] hover:bg-gray-50"
                    )}
                  >
                    <CreditCard className={cn("w-6 h-6", activeTab === 'rates' ? "text-[#2563EB]" : "text-[#94A3B8]")} />
                    <span className="font-semibold">Rate Card</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('countries');
                      setIsSettingsMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 text-base transition-all duration-200",
                      activeTab === 'countries' ? "bg-[#F0F7FF] text-[#2563EB]" : "text-[#475569] hover:bg-gray-50"
                    )}
                  >
                    <Globe className={cn("w-6 h-6", activeTab === 'countries' ? "text-[#2563EB]" : "text-[#94A3B8]")} />
                    <span className="font-semibold text-left leading-tight">Manage<br />Countries</span>
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab('phases');
                      setIsSettingsMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 text-base transition-all duration-200",
                      activeTab === 'phases' ? "bg-[#F0F7FF] text-[#2563EB]" : "text-[#475569] hover:bg-gray-50"
                    )}
                  >
                    <Layers className={cn("w-6 h-6", activeTab === 'phases' ? "text-[#2563EB]" : "text-[#94A3B8]")} />
                    <span className="font-semibold">Phases</span>
                  </button>
                  {isSystemAdmin && (
                    <button 
                      onClick={() => {
                        setActiveTab('admin');
                        setIsSettingsMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 text-base transition-all duration-200",
                        activeTab === 'admin' ? "bg-[#F0F7FF] text-[#2563EB]" : "text-[#475569] hover:bg-gray-50"
                      )}
                    >
                      <Shield className={cn("w-6 h-6", activeTab === 'admin' ? "text-[#2563EB]" : "text-[#94A3B8]")} />
                      <span className="font-semibold text-left leading-tight">System<br />Admin</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          {user && (
            <>
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1",
                      isSidebarCollapsed && "left-1/2 -translate-x-1/2 w-48"
                    )}
                  >
                    <button 
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserCircle className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">Profile</span>
                    </button>
                    <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <LifeBuoy className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">Help</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </button>
                    <div className="h-px bg-gray-100 my-1 mx-2" />
                    <button 
                      onClick={() => {
                        handleLogout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Log out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                onClick={() => {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                  setIsSettingsMenuOpen(false);
                }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group relative cursor-pointer",
                  isSidebarCollapsed && "justify-center",
                  isProfileMenuOpen && "bg-gray-50"
                )}
              >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm overflow-hidden",
                      !(userProfile?.photoURL || user.photoURL) && "bg-[#2E86C1]"
                    )}>
                      {userProfile?.photoURL || user.photoURL ? (
                        <img 
                          src={userProfile?.photoURL || user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        user.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U'
                      )}
                    </div>
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900 truncate leading-tight">{user.displayName || 'User'}</p>
                    <p className="text-sm text-gray-400 font-semibold">Free</p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="px-2 pb-2">
            <button
              id="btn-settings"
              onClick={() => {
                setIsSettingsMenuOpen(!isSettingsMenuOpen);
                setIsProfileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 transition-all duration-300 rounded-2xl",
                isSidebarCollapsed ? "justify-center px-0" : "justify-start",
                isSettingsMenuOpen ? "bg-[#F0F7FF] text-[#2563EB]" : "text-[#475569] hover:bg-gray-50"
              )}
            >
              <Settings2 className={cn("w-6 h-6 shrink-0", isSettingsMenuOpen ? "text-[#2563EB]" : "text-[#475569]")} />
              {!isSidebarCollapsed && <span className="text-lg font-semibold">Settings</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header id="app-header" className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 z-10 shadow-sm h-[73px] flex items-center shrink-0">
          <div className="w-full flex justify-between items-center">
            <div id="header-logo" className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="xl:hidden text-gray-500 hover:text-blue-600"
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg shrink-0">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Services Pricing Workbook</h1>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate hidden xs:block">Scoping & Pricing Workbook</p>
                  {isSystemAdmin && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[9px] font-black uppercase py-0 px-1.5 h-4">
                      System Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div id="header-actions" className="flex items-center gap-2 sm:gap-4">
              {user && activeProjectId && !isSystemAdmin && (
                <div className="flex items-center gap-2 mr-2">
                  <TooltipProvider>
                    <div className="flex -space-x-2 overflow-hidden">
                      {activePresences.map((presence) => (
                        <div key={presence.uid}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="w-8 h-8 border-2 border-white ring-2 ring-gray-50">
                                <AvatarImage src={presence.photoURL} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-[10px] font-bold">
                                  {presence.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">{presence.displayName} is viewing</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  </TooltipProvider>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsShareModalOpen(true)}
                    className="gap-2 rounded-xl border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all h-9"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </div>
              )}
              {!user && (
                <Button id="btn-signin" onClick={handleLogin} disabled={isLoggingIn} className="bg-blue-600 hover:bg-blue-700 gap-2 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm">
                  {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span className="hidden xs:inline">{isLoggingIn ? 'Signing in...' : 'Sign In'}</span>
                  <span className="xs:hidden">{isLoggingIn ? '...' : 'Login'}</span>
                </Button>
              )}
              {user && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-6 w-px bg-gray-200 mx-1 sm:mx-2" />
                  <div 
                    onClick={() => {
                      setIsProfileMenuOpen(!isProfileMenuOpen);
                      setIsSettingsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors xl:hidden"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm overflow-hidden",
                      !(userProfile?.photoURL || user.photoURL) && "bg-[#2E86C1]"
                    )}>
                      {userProfile?.photoURL || user.photoURL ? (
                        <img 
                          src={userProfile?.photoURL || user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        user.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U'
                      )}
                    </div>
                  </div>
                </div>
              )}
              {saving && <Loader2 id="saving-indicator" className="w-4 h-4 text-blue-600 animate-spin" />}
            </div>
          </div>
        </header>

        <main id="app-main" className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <Alert id="app-error-alert" variant="destructive" className="mb-6">
              <AlertDescription className="flex justify-between items-center">
                {error}
                <Button id="btn-dismiss-error" variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {activeTab !== 'admin' && (
              <div className="sticky top-[-16px] sm:top-[-24px] z-20 bg-[#F8F9FA]/90 backdrop-blur-md flex justify-start overflow-x-auto pb-4 mb-6 no-scrollbar -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 border-b border-gray-200/50">
                <TabsList id="tabs-list" className="bg-white border border-gray-200 p-1 h-auto flex-nowrap shadow-sm">
                  <TabsTrigger id="tab-summary" value="summary" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Project Summary</span>
                    <span className="sm:hidden">Summary</span>
                  </TabsTrigger>
                  <TabsTrigger id="tab-resources" value="resources" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Resource Planning</span>
                    <span className="sm:hidden">Resources</span>
                  </TabsTrigger>
                  <TabsTrigger id="tab-financials" value="financials" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Financial Summary</span>
                    <span className="sm:hidden">Financials</span>
                  </TabsTrigger>
                  <TabsTrigger id="tab-scenarios" value="scenarios" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 gap-2">
                    <Settings2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Pricing Scenarios</span>
                    <span className="sm:hidden">Scenarios</span>
                  </TabsTrigger>
                  <TabsTrigger id="tab-history" value="history" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 gap-2">
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">Change History</span>
                    <span className="sm:hidden">History</span>
                  </TabsTrigger>
                  <TabsTrigger id="tab-pos" value="pos" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span className="hidden sm:inline">Projects & POs</span>
                    <span className="sm:hidden">POs</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            )}

            {!user && (
              <Card id="signin-promo-card" className="mb-8 border-blue-100 bg-blue-50/30">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Save className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h2 className="text-xl font-bold text-gray-900">Sign in to save your work</h2>
                    <p className="text-gray-600 mt-2">Connect your Google account to persist your pricing projects and access them from anywhere.</p>
                  </div>
                  <Button id="btn-get-started" onClick={handleLogin} disabled={isLoggingIn} size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2 px-8">
                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                    {isLoggingIn ? 'Signing in...' : 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <TabsContent id="content-summary" value="summary" className="mt-0">
              <div className="mb-8">
                <StatusChevron />
              </div>
              <ProjectSummaryTab 
                data={data.projectSummary} 
                countries={globalSettings.countries}
                updateData={updateProjectSummary} 
                resourcePlan={data.resourcePlan}
                rateCard={globalSettings.rateCard}
                phases={globalSettings.phases}
                phaseAllocation={data.phaseAllocation || {}}
                templates={globalSettings.templates || []}
                onSaveAsTemplate={saveAsTemplate}
                onUpdateTemplate={updateTemplate}
                onApplyTemplate={applyTemplate}
                onDeleteTemplate={deleteTemplate}
              />
            </TabsContent>
            <TabsContent id="content-resources" value="resources" className="mt-0">
              <ResourcePlanningTab 
                data={data.resourcePlan} 
                rateCard={globalSettings.rateCard} 
                projectSummary={data.projectSummary}
                phases={globalSettings.phases}
                phaseAllocation={data.phaseAllocation || {}}
                updateData={updateResourcePlan} 
                updateProjectSummary={updateProjectSummary}
                updateProjectAndData={updateProjectAndData}
                updatePhaseAllocation={updatePhaseAllocation}
                updateGlobalSettings={setUserGlobalSettings}
                permission={permission}
                isShared={isShared}
                ownerId={activeProject.ownerId}
              />
            </TabsContent>
            <TabsContent id="content-financials" value="financials" className="mt-0">
              <FinancialSummaryTab 
                data={data.financialSummary} 
                currency={data.projectSummary.currency} 
                updateData={updateFinancialSummary}
                projectSummary={data.projectSummary}
                updateProjectSummary={updateProjectSummary}
                resourcePlan={data.resourcePlan}
                rateCard={globalSettings.rateCard}
                phases={globalSettings.phases}
                phaseAllocation={data.phaseAllocation || {}}
              />
            </TabsContent>
            <TabsContent id="content-scenarios" value="scenarios" className="mt-0">
              <PricingScenariosTab data={data.pricingScenarios} currency={data.projectSummary.currency} updateData={updatePricingScenarios} />
            </TabsContent>
            <TabsContent id="content-rates" value="rates" className="mt-0">
              <RateCardTab 
                data={globalSettings.rateCard} 
                countries={globalSettings.countries}
                updateData={updateRateCard} 
                updateCountries={updateCountries}
                onRenameRole={handleRenameRole}
              />
            </TabsContent>
            <TabsContent id="content-countries" value="countries" className="mt-0">
              <RateCardTab 
                data={globalSettings.rateCard} 
                countries={globalSettings.countries}
                updateData={updateRateCard} 
                updateCountries={updateCountries}
                onRenameRole={handleRenameRole}
                initialShowCountriesMeta={true}
              />
            </TabsContent>
            <TabsContent id="content-history" value="history" className="mt-0">
              <ChangeHistoryTab 
                data={data.changeHistory} 
                onAddEntry={addHistoryEntry} 
                currentProjectData={data}
                currency={data.projectSummary.currency}
              />
            </TabsContent>
            <TabsContent id="content-pos" value="pos" className="mt-0">
              <ProjectsAndPOsTab data={data.projectsAndPOs} updateData={updateProjectsAndPOs} />
            </TabsContent>
            <TabsContent id="content-phases" value="phases" className="mt-0">
              <PhasesSettingsTab 
                phases={globalSettings.phases} 
                updatePhases={updatePhases} 
              />
            </TabsContent>
            {isSystemAdmin && (
              <TabsContent id="content-admin" value="admin" className="mt-0">
                <AdminTab 
                  globalSettings={globalSettings}
                  updateGlobalSettings={updateGlobalSettings}
                  currentUser={user}
                  activeSubTab={adminSubTab}
                />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        user={user} 
        onUpdate={handleProfileUpdate}
      />
      {activeProject && user && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          projectId={activeProjectId}
          projectName={activeProject.name || 'Untitled Project'}
          ownerId={activeProject.ownerId || user.uid}
          ownerEmail={activeProject.ownerEmail || user.email || ''}
        />
      )}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Project</h3>
            <p className="mb-6">Are you sure you want to delete this project? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setProjectToDelete(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={confirmDeleteProject} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
      <AIAgentSlideOut isOpen={isAIAgentOpen} onClose={() => setIsAIAgentOpen(false)} data={data} updateData={setData} isSidebarCollapsed={isSidebarCollapsed} globalSettings={globalSettings} />
      
      <button
        onClick={() => setIsAIAgentOpen(true)}
        className="fixed bottom-6 right-6 z-40 transition-all hover:scale-105 active:scale-95 overflow-hidden w-14 h-14 flex items-center justify-center bg-transparent rounded-full"
      >
        {globalSettings.aiAgentSettings?.profileImageURL ? (
          <img 
            src={globalSettings.aiAgentSettings.profileImageURL} 
            alt="AI Agent" 
            className="w-full h-full object-contain" 
            referrerPolicy="no-referrer" 
          />
        ) : (
          <Bot className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}

