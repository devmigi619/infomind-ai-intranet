import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

// ─── 타입 ──────────────────────────────────────────────────────────────

export interface Board {
  brdId: string;
  brdSe: string;
  brdNm: string;
  brdDesc?: string;
  deptCd?: string;
  ord?: number;
  fileUseYn: string;
  cmtUseYn: string;
  useYn: string;
}

export interface Post {
  brdId: string;
  pstSn: number;
  pstTtl: string;
  pstDesc: string;
  userId: string;
  ntcYn: string;
  delYn: string;
  pstDelSe?: string;
  qryCnt: number;
  likeNum: number;
  pstRmk?: string;
  pstOrd?: number;
  pubStYmd?: string;
  pubEndYmd?: string;
  afileId?: string;
  crtAt: string;
  crtBy?: string;
  updAt?: string;
  updBy?: string;
}

export interface PostComment {
  brdId: string;
  pstSn: number;
  cmtSn: number;
  cmtLvl: number;
  upCmtSn?: number;
  cmtTtl?: string;
  cmtDesc: string;
  userId: string;
  delYn: string;
  cmtDelSe?: string;
  likeCnt: number;
  crtAt: string;
  crtBy?: string;
  updAt?: string;
  updBy?: string;
}

export interface CreatePostRequest {
  pstTtl: string;
  pstDesc: string;
  userId: string;
  ntcYn?: string;
  pstRmk?: string;
  afileId?: string;
}

export interface UpdatePostRequest {
  pstTtl: string;
  pstDesc: string;
  ntcYn?: string;
  pstRmk?: string;
  afileId?: string;
}

export interface DeletePostRequest {
  userId: string;
  admin: boolean;
}

export interface CreateCommentRequest {
  cmtDesc: string;
  userId: string;
  cmtTtl?: string;
  cmtLvl?: number;
  upCmtSn?: number;
}

export interface UpdateCommentRequest {
  cmtDesc: string;
  cmtTtl?: string;
}

export interface DeleteCommentRequest {
  userId: string;
  admin: boolean;
}

// ─── HTTP 함수 ────────────────────────────────────────────────────────

const boardsApi = {
  getBoards: (): Promise<Board[]> =>
    apiClient.get('/api/boards').then((r) => r.data?.data ?? []),

  getPosts: (brdId: string): Promise<Post[]> =>
    apiClient.get(`/api/boards/${brdId}/posts`).then((r) => r.data?.data ?? []),

  getPost: (brdId: string, pstSn: number): Promise<Post> =>
    apiClient.get(`/api/boards/${brdId}/posts/${pstSn}`).then((r) => r.data.data),

  createPost: (brdId: string, data: CreatePostRequest): Promise<Post> =>
    apiClient.post(`/api/boards/${brdId}/posts`, data).then((r) => r.data.data),

  updatePost: (brdId: string, pstSn: number, data: UpdatePostRequest): Promise<Post> =>
    apiClient.put(`/api/boards/${brdId}/posts/${pstSn}`, data).then((r) => r.data.data),

  deletePost: (brdId: string, pstSn: number, data: DeletePostRequest): Promise<void> =>
    apiClient
      .delete(`/api/boards/${brdId}/posts/${pstSn}`, { data })
      .then(() => undefined),

  likePost: (brdId: string, pstSn: number): Promise<Post> =>
    apiClient.post(`/api/boards/${brdId}/posts/${pstSn}/like`).then((r) => r.data.data),

  getComments: (brdId: string, pstSn: number): Promise<PostComment[]> =>
    apiClient
      .get(`/api/boards/${brdId}/posts/${pstSn}/comments`)
      .then((r) => r.data?.data ?? []),

  createComment: (
    brdId: string,
    pstSn: number,
    data: CreateCommentRequest,
  ): Promise<PostComment> =>
    apiClient
      .post(`/api/boards/${brdId}/posts/${pstSn}/comments`, data)
      .then((r) => r.data.data),

  updateComment: (
    brdId: string,
    pstSn: number,
    cmtSn: number,
    data: UpdateCommentRequest,
  ): Promise<PostComment> =>
    apiClient
      .put(`/api/boards/${brdId}/posts/${pstSn}/comments/${cmtSn}`, data)
      .then((r) => r.data.data),

  deleteComment: (
    brdId: string,
    pstSn: number,
    cmtSn: number,
    data: DeleteCommentRequest,
  ): Promise<void> =>
    apiClient
      .delete(`/api/boards/${brdId}/posts/${pstSn}/comments/${cmtSn}`, { data })
      .then(() => undefined),
};

// ─── React Query 훅 ──────────────────────────────────────────────────

export const useBoards = () =>
  useQuery({
    queryKey: ['boards'],
    queryFn: boardsApi.getBoards,
  });

export const useBoardPosts = (brdId: string | null | undefined) =>
  useQuery({
    queryKey: ['board-posts', brdId],
    queryFn: () => boardsApi.getPosts(brdId as string),
    enabled: !!brdId,
  });

export const usePostDetail = (brdId: string | null | undefined, pstSn: number | null | undefined) =>
  useQuery({
    queryKey: ['post-detail', brdId, pstSn],
    queryFn: () => boardsApi.getPost(brdId as string, pstSn as number),
    enabled: !!brdId && !!pstSn,
    // 상세 조회 시마다 서버에서 조회수가 증가하므로 캐시는 짧게
    staleTime: 0,
    gcTime: 0,
  });

export const useCreatePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brdId, data }: { brdId: string; data: CreatePostRequest }) =>
      boardsApi.createPost(brdId, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['board-posts', vars.brdId] });
    },
  });
};

export const useUpdatePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      brdId,
      pstSn,
      data,
    }: {
      brdId: string;
      pstSn: number;
      data: UpdatePostRequest;
    }) => boardsApi.updatePost(brdId, pstSn, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['board-posts', vars.brdId] });
      qc.invalidateQueries({ queryKey: ['post-detail', vars.brdId, vars.pstSn] });
    },
  });
};

export const useDeletePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      brdId,
      pstSn,
      data,
    }: {
      brdId: string;
      pstSn: number;
      data: DeletePostRequest;
    }) => boardsApi.deletePost(brdId, pstSn, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['board-posts', vars.brdId] });
    },
  });
};

export const useLikePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brdId, pstSn }: { brdId: string; pstSn: number }) =>
      boardsApi.likePost(brdId, pstSn),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['post-detail', vars.brdId, vars.pstSn] });
      qc.invalidateQueries({ queryKey: ['board-posts', vars.brdId] });
    },
  });
};

export const usePostComments = (
  brdId: string | null | undefined,
  pstSn: number | null | undefined,
) =>
  useQuery({
    queryKey: ['post-comments', brdId, pstSn],
    queryFn: () => boardsApi.getComments(brdId as string, pstSn as number),
    enabled: !!brdId && !!pstSn,
  });

export const useCreateComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      brdId,
      pstSn,
      data,
    }: {
      brdId: string;
      pstSn: number;
      data: CreateCommentRequest;
    }) => boardsApi.createComment(brdId, pstSn, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['post-comments', vars.brdId, vars.pstSn] });
    },
  });
};

export const useUpdateComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      brdId,
      pstSn,
      cmtSn,
      data,
    }: {
      brdId: string;
      pstSn: number;
      cmtSn: number;
      data: UpdateCommentRequest;
    }) => boardsApi.updateComment(brdId, pstSn, cmtSn, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['post-comments', vars.brdId, vars.pstSn] });
    },
  });
};

export const useDeleteComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      brdId,
      pstSn,
      cmtSn,
      data,
    }: {
      brdId: string;
      pstSn: number;
      cmtSn: number;
      data: DeleteCommentRequest;
    }) => boardsApi.deleteComment(brdId, pstSn, cmtSn, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['post-comments', vars.brdId, vars.pstSn] });
    },
  });
};

export { boardsApi };
