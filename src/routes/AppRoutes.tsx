import React from 'react';
import { Navigate, Route } from 'react-router-dom';

const HomePage = React.lazy(() => import('@/pages/user/HomePage'));
const ChatPage = React.lazy(() => import('@/pages/user/ChatPage'));
const ProfilePage = React.lazy(() => import('@/pages/user/ProfilePage'));
const SearchPage = React.lazy(() => import('@/pages/user/SearchPage'));
const AdminLayout = React.lazy(() => import('@/pages/admin/AdminLayout'));
const AdminHubPage = React.lazy(() => import('@/pages/admin/AdminHubPage'));
const AdminGroupsPage = React.lazy(() => import('@/pages/admin/sections/AdminGroupsPage'));
const AdminUsersPage = React.lazy(() => import('@/pages/admin/sections/AdminUsersPage'));
const AdminStatisticsPage = React.lazy(() => import('@/pages/admin/sections/AdminStatisticsPage'));
const AdminPostsPage = React.lazy(() => import('@/pages/admin/sections/AdminPostsPage'));
const AdminResourcesPage = React.lazy(() => import('@/pages/admin/sections/AdminResourcesPage'));
const AdminAiPage = React.lazy(() => import('@/pages/admin/sections/AdminAiPage'));
const LiveDirectoryPage = React.lazy(() => import('@/pages/user/LiveDirectoryPage'));
const LiveWatchPage = React.lazy(() => import('@/pages/user/LiveWatchPage'));
const LiveHostPage = React.lazy(() => import('@/pages/user/LiveHostPage'));
const ReelsPage = React.lazy(() => import('@/pages/user/ReelsPage'));
const JoinGroupPage = React.lazy(() => import('@/pages/user/JoinGroupPage'));
const CommunitiesPage = React.lazy(() => import('@/pages/user/CommunitiesPage'));
const JoinCommunityPage = React.lazy(() => import('@/pages/user/JoinCommunityPage'));

export const liveImmersiveRouteElements = (
  <>
    <Route path="/live/:sessionId/studio" element={<LiveHostPage />} />
    <Route path="/live/:sessionId" element={<LiveWatchPage />} />
  </>
);

export const appRouteElements = (
  <>
    <Route path="/" element={<HomePage />} />
    <Route path="/community" element={<Navigate to="/communities" replace />} />
    <Route path="/communities" element={<CommunitiesPage />} />
    <Route path="/communities/:groupId" element={<CommunitiesPage />} />
    <Route path="/live" element={<LiveDirectoryPage />} />
    {/* develop cũ dùng /studio + StudioPage mock — chuyển sang live mới */}
    <Route path="/studio" element={<Navigate to="/live" replace />} />
    <Route path="/join/:suffix" element={<JoinGroupPage />} />
    <Route path="/c/join/:inviteCode" element={<JoinCommunityPage />} />
    <Route path="/chat/:conversationId" element={<ChatPage />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/profile/:userId" element={<ProfilePage />} />
    <Route path="/reels" element={<ReelsPage />} />
    <Route path="/reels/:reelId" element={<ReelsPage />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminHubPage />} />
      <Route path="groups" element={<AdminGroupsPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="statistics" element={<AdminStatisticsPage />} />
      <Route path="posts" element={<AdminPostsPage />} />
      <Route path="resources" element={<AdminResourcesPage />} />
      <Route path="ai" element={<AdminAiPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);
