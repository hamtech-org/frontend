import React from 'react';
import { Navigate, Route } from 'react-router-dom';

const HomePage = React.lazy(() => import('@/pages/user/HomePage'));
const ChatPage = React.lazy(() => import('@/pages/user/ChatPage'));
const ContactsPage = React.lazy(() => import('@/pages/user/ContactsPage'));
const StudioPage = React.lazy(() => import('@/pages/user/StudioPage'));
const AIStudioPage = React.lazy(() => import('@/pages/user/AIStudioPage'));
const ProfilePage = React.lazy(() => import('@/pages/user/ProfilePage'));
const SearchPage = React.lazy(() => import('@/pages/user/SearchPage'));
const AdminLayout = React.lazy(() => import('@/pages/admin/AdminLayout'));
const AdminHubPage = React.lazy(() => import('@/pages/admin/AdminHubPage'));
const AdminGroupsPage = React.lazy(() => import('@/pages/admin/sections/AdminGroupsPage'));
const AdminUsersPage = React.lazy(() => import('@/pages/admin/sections/AdminUsersPage'));
const AdminStatisticsPage = React.lazy(() => import('@/pages/admin/sections/AdminStatisticsPage'));
const AdminPostsPage = React.lazy(() => import('@/pages/admin/sections/AdminPostsPage'));
const AdminResourcesPage = React.lazy(() => import('@/pages/admin/sections/AdminResourcesPage'));
const AdminAiFilterPage = React.lazy(() => import('@/pages/admin/sections/AdminAiFilterPage'));
const AdminAnalytics = React.lazy(() => import('@/pages/admin/AdminAnalytics'));
const ComponentsDemoPage = React.lazy(() => import('@/pages/user/ComponentsDemoPage'));
const ReelsPage = React.lazy(() => import('@/pages/user/ReelsPage'));
const JoinGroupPage = React.lazy(() => import('@/pages/user/JoinGroupPage'));

export const appRouteElements = (
  <>
    <Route path="/" element={<HomePage />} />
    <Route path="/community" element={<ContactsPage />} />
    <Route path="/studio" element={<StudioPage />} />
    <Route path="/join/:suffix" element={<JoinGroupPage />} />
    <Route path="/chat/:conversationId" element={<ChatPage />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/analytics" element={<AdminAnalytics />} />
    <Route path="/ai-studio" element={<AIStudioPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/profile/:userId" element={<ProfilePage />} />
    <Route path="/components-demo" element={<ComponentsDemoPage />} />
    <Route path="/reels" element={<ReelsPage />} />
    <Route path="/reels/:reelId" element={<ReelsPage />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminHubPage />} />
      <Route path="groups" element={<AdminGroupsPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="statistics" element={<AdminStatisticsPage />} />
      <Route path="posts" element={<AdminPostsPage />} />
      <Route path="resources" element={<AdminResourcesPage />} />
      <Route path="ai-filter" element={<AdminAiFilterPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);
