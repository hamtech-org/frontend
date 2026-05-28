import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseAppShellStateResult {
  isMobileViewport: boolean;
  isTabletViewport: boolean;
  isSidebarOpen: boolean;
  isMobileSidebarOpen: boolean;
  isMobileSearchOpen: boolean;
  isDesktopSidebarExpanded: boolean;
  setIsMobileSidebarOpen: Dispatch<SetStateAction<boolean>>;
  handleToggleSidebar: () => void;
  handleNavigate: (path: string) => void;
  toggleMobileSearch: () => void;
}

export const useAppShellState = (pathname: string): UseAppShellStateResult => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(false);

  const isImmersiveSidebarRoute =
    pathname.startsWith('/communities') || pathname.startsWith('/chat');
  const isDesktopSidebarExpanded = !isTabletViewport && isSidebarOpen && !isImmersiveSidebarRoute;

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');

    const updateViewportState = (): void => {
      setIsMobileViewport(mobileQuery.matches);
      setIsTabletViewport(tabletQuery.matches);
    };

    updateViewportState();
    mobileQuery.addEventListener('change', updateViewportState);
    tabletQuery.addEventListener('change', updateViewportState);

    return () => {
      mobileQuery.removeEventListener('change', updateViewportState);
      tabletQuery.removeEventListener('change', updateViewportState);
    };
  }, []);

  useEffect(() => {
    if (isTabletViewport) {
      setIsSidebarOpen(false);
    }
  }, [isTabletViewport]);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMobileSidebarOpen(false);
      setIsMobileSearchOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    setIsMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!(isMobileViewport && isMobileSidebarOpen)) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen, isMobileViewport]);

  useEffect(() => {
    const handleToggleMobileSidebar = () => {
      setIsMobileSidebarOpen((previousState) => !previousState);
    };
    window.addEventListener('toggle-mobile-sidebar', handleToggleMobileSidebar);
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggleMobileSidebar);
    };
  }, []);

  const handleToggleSidebar = useCallback((): void => {
    if (isMobileViewport) {
      setIsMobileSidebarOpen((previousState) => !previousState);
      return;
    }

    if (isTabletViewport) {
      return;
    }

    setIsSidebarOpen((previousState) => !previousState);
  }, [isMobileViewport, isTabletViewport]);

  const handleNavigate = useCallback(
    (path: string): void => {
      navigate(path);
      if (isMobileViewport) {
        setIsMobileSidebarOpen(false);
        setIsMobileSearchOpen(false);
      }
    },
    [isMobileViewport, navigate],
  );

  const toggleMobileSearch = useCallback((): void => {
    setIsMobileSearchOpen((previousState) => !previousState);
  }, []);

  return {
    isMobileViewport,
    isTabletViewport,
    isSidebarOpen,
    isMobileSidebarOpen,
    isMobileSearchOpen,
    isDesktopSidebarExpanded,
    setIsMobileSidebarOpen,
    handleToggleSidebar,
    handleNavigate,
    toggleMobileSearch,
  };
};
