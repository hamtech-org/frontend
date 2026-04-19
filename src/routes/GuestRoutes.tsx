import React from 'react';
import { Route } from 'react-router-dom';

const LoginPage = React.lazy(() => import('@/pages/user/LoginPage'));
const OnboardingPage = React.lazy(() => import('@/pages/user/OnboardingPage'));

export const guestRouteElements = (
  <>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/onboarding" element={<OnboardingPage />} />
  </>
);
