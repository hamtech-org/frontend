import React from 'react';
import { Navigate, Route } from 'react-router-dom';

const HomePage = React.lazy(() => import('@/pages/user/HomePage'));
const ChatPage = React.lazy(() => import('@/pages/user/ChatPage'));
const ContactsPage = React.lazy(() => import('@/pages/user/ContactsPage'));
const StudioPage = React.lazy(() => import('@/pages/user/StudioPage'));
const AIStudioPage = React.lazy(() => import('@/pages/user/AIStudioPage'));
const ProfilePage = React.lazy(() => import('@/pages/user/ProfilePage'));
const SearchPage = React.lazy(() => import('@/pages/user/SearchPage'));
const PostEditorPage = React.lazy(() => import('@/pages/user/PostEditorPage'));
const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminAnalytics = React.lazy(() => import('@/pages/admin/AdminAnalytics'));
const ComponentsDemoPage = React.lazy(() => import('@/pages/user/ComponentsDemoPage'));

export const appRouteElements = (
  <>
    <Route path="/" element={<HomePage />} />
    <Route path="/community" element={<ContactsPage />} />
    <Route path="/studio" element={<StudioPage />} />
    <Route path="/chat/:conversationId" element={<ChatPage />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/analytics" element={<AdminAnalytics />} />
    <Route path="/ai-studio" element={<AIStudioPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/posts/new" element={<PostEditorPage />} />
    <Route path="/posts/:postId/edit" element={<PostEditorPage />} />
    <Route path="/components-demo" element={<ComponentsDemoPage />} />
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);
