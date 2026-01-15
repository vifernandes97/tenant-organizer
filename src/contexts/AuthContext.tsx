import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserRole {
  role: 'owner' | 'member';
  tenant_id: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  tenant: Tenant | null;
  isLoading: boolean;
  profileNotFound: boolean;
  signUp: (email: string, password: string, fullName: string, tenantName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeSetup: (fullName: string, tenantName: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      setProfileNotFound(false);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        console.log('Profile not found for user:', userId);
        setProfileNotFound(true);
        setProfile(null);
        setUserRole(null);
        setTenant(null);
        return;
      }

      setProfile(profileData);
      setProfileNotFound(false);

      // Fetch user role
      if (profileData.tenant_id) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role, tenant_id')
          .eq('user_id', userId)
          .eq('tenant_id', profileData.tenant_id)
          .single();

        if (roleData) {
          setUserRole(roleData as UserRole);
        }

        // Fetch tenant
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profileData.tenant_id)
          .single();

        if (tenantData) {
          setTenant(tenantData);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setProfileNotFound(true);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setTenant(null);
          setProfileNotFound(false);
        }
        setIsLoading(false);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, tenantName: string) => {
    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      const userId = authData.user.id;

      // 2. Create tenant
      const slug = tenantName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Date.now().toString(36);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: tenantName, slug })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 3. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          tenant_id: tenantData.id,
          full_name: fullName,
        });

      if (profileError) throw profileError;

      // 4. Create user role (owner)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          tenant_id: tenantData.id,
          role: 'owner',
        });

      if (roleError) throw roleError;

      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error: error as Error };
    }
  };

  const completeSetup = async (fullName: string, tenantName: string) => {
    if (!user) {
      return { error: new Error('Usuário não autenticado') };
    }

    try {
      // 1. Create tenant
      const slug = tenantName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Date.now().toString(36);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: tenantName, slug })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          tenant_id: tenantData.id,
          full_name: fullName,
        });

      if (profileError) throw profileError;

      // 3. Create user role (owner)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          tenant_id: tenantData.id,
          role: 'owner',
        });

      if (roleError) throw roleError;

      // 4. Refresh user data
      await fetchUserData(user.id);

      return { error: null };
    } catch (error) {
      console.error('Complete setup error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserRole(null);
    setTenant(null);
    setProfileNotFound(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        userRole,
        tenant,
        isLoading,
        profileNotFound,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        completeSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}