import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export interface UserProfile {
  name: string;
  role: string;
  avatarText?: string; // For generated avatar from initial
  // avatarUrl?: string; // If actual image avatars are supported later
}

interface UserContextType {
  user: UserProfile | null;
  isLoadingUser: boolean;
  loginUser: (profile: UserProfile) => void; // For explicit login action
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  logoutUser: () => void; // For explicit logout
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'datapressoUser';

const defaultUser: UserProfile = {
  name: "访客用户",
  role: "数据探索者",
  avatarText: "访",
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as UserProfile;
        if (!parsedUser.avatarText && parsedUser.name) {
          parsedUser.avatarText = parsedUser.name.charAt(0).toUpperCase();
        }
        setUser(parsedUser);
      } else {
        // For an "offline" version, we can set a default user if none is stored
        // Or, require a "login" action on first visit.
        // For now, let's default to a guest user if nothing is stored.
        setUser(defaultUser); 
      }
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
      setUser(defaultUser); // Fallback to default on error
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const loginUser = (profile: UserProfile) => {
    const profileToSave = { ...profile };
    if (!profileToSave.avatarText && profileToSave.name) {
      profileToSave.avatarText = profileToSave.name.charAt(0).toUpperCase();
    }
    setUser(profileToSave);
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profileToSave));
    } catch (error) {
      console.error("Error saving user to localStorage:", error);
    }
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUser(prevUser => {
      if (!prevUser) return null; // Should not happen if initialized correctly
      const updatedUser = { ...prevUser, ...updates };
      if (updates.name && (!updates.avatarText || prevUser.name !== updates.name)) {
        updatedUser.avatarText = updatedUser.name.charAt(0).toUpperCase();
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedUser));
      } catch (error) {
        console.error("Error saving updated user to localStorage:", error);
      }
      return updatedUser;
    });
  };

  const logoutUser = () => {
    setUser(null); // Or reset to defaultUser for guest experience
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      // Optionally set to defaultUser after logout
      // setUser(defaultUser);
      // localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(defaultUser));
    } catch (error) {
      console.error("Error removing user from localStorage:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, isLoadingUser, loginUser, updateUserProfile, logoutUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};