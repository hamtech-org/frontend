import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreatePostMutation,
  useGetPostByIdQuery,
  useUpdatePostMutation,
} from '@/store/api/newsfeedApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import type { PostPublicationStatus, PostVisibility } from '@/types/newsfeed.types';
import TiptapPostEditor from '@/components/newsfeed/TiptapPostEditor';

const parseCsv = (raw: string): string[] => {
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50);
};

export default function PostEditorPage() {
  const params = useParams<{ postId: string }>();
  const postId = params.postId;
  const isEdit = !!postId;

  const navigate = useNavigate();

  const { data: postRes } = useGetPostByIdQuery(postId ?? '', { skip: !isEdit });
  const post = postRes?.data;

  const emptyTiptapJson = useMemo(
    () => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
    [],
  );
  const [content, setContent] = useState<string>(() => emptyTiptapJson);
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [publicationStatus, setPublicationStatus] = useState<PostPublicationStatus>('published');
  const [categoriesText, setCategoriesText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const categories = useMemo(() => parseCsv(categoriesText), [categoriesText]);
  const tags = useMemo(() => parseCsv(tagsText), [tagsText]);

  const postType: 'text' | 'image' | 'video' | 'link' = mediaUrls.length > 0 ? 'image' : 'text';

  const [createPost, { isLoading: creating }] = useCreatePostMutation();
  const [updatePost, { isLoading: updating }] = useUpdatePostMutation();
  const [uploadMedia, { isLoading: uploading }] = useUploadMediaMutation();

  useEffect(() => {
    if (!post) return;
    setContent(post.content ?? '');
    setVisibility(post.visibility);
    setPublicationStatus(post.publicationStatus);
    setCategoriesText((post.categories ?? []).join(', '));
    setTagsText((post.tags ?? []).join(', '));
    setMediaUrls(post.mediaUrls ?? []);
  }, [post]);

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      const res = await uploadMedia({
        file,
        mediaType: 'image',
        deliveryScope: 'general',
      }).unwrap();
      const url = res.data?.url?.trim() ?? '';
      if (!url) return '';
      setMediaUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
      return url;
    },
    [uploadMedia],
  );

  const busy = creating || updating || uploading;

  const onSubmit = async () => {
    if (!content.trim()) return;

    const payload = {
      content,
      type: postType,
      visibility,
      publicationStatus,
      categories,
      tags,
      mediaUrls,
    };

    if (isEdit && postId) {
      await updatePost({ postId, data: payload }).unwrap();
      navigate(`/post/${postId}`);
      return;
    }

    const created = await createPost(payload).unwrap();
    const id = created.data?.postId;
    if (id) navigate(`/post/${id}`);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{isEdit ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}</h1>
      </div>

      <div className="rounded-3xl border border-border/40 bg-card p-6 space-y-5">
        <TiptapPostEditor value={content} onChange={setContent} onUploadImage={uploadImage} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">Hiển thị</label>
            <select
              className="w-full rounded-2xl border border-border/40 bg-background p-3 text-sm outline-none"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            >
              <option value="public">Công khai</option>
              <option value="friends">Bạn bè</option>
              <option value="private">Chỉ mình tôi</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Trạng thái đăng</label>
            <select
              className="w-full rounded-2xl border border-border/40 bg-background p-3 text-sm outline-none"
              value={publicationStatus}
              onChange={(e) => setPublicationStatus(e.target.value as PostPublicationStatus)}
            >
              <option value="published">Đã đăng</option>
              <option value="draft">Nháp</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">Categories</label>
            <input
              className="w-full rounded-2xl border border-border/40 bg-background p-3 text-sm outline-none"
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
              placeholder="vd: tin-tuc, chia-se"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">Tags</label>
            <input
              className="w-full rounded-2xl border border-border/40 bg-background p-3 text-sm outline-none"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="vd: tiptap, react"
            />
          </div>
        </div>

        {mediaUrls.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-bold">Preview</p>
            {mediaUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt="Preview"
                className="w-full rounded-2xl"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
            onClick={() => void onSubmit()}
            disabled={busy}
          >
            {isEdit ? 'Lưu thay đổi' : 'Đăng bài'}
          </button>
          <button
            type="button"
            className="rounded-2xl bg-black/5 px-6 py-3 text-sm font-bold hover:bg-black/10"
            onClick={() => navigate(isEdit ? `/post/${postId}` : '/')}
            disabled={busy}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
