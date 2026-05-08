import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface Department {
  deptCd: string;
  upDeptCd: string | null;
  deptNm: string;
  deptLvl: number;
  useYn: string;
}

export interface CreateDeptRequest {
  deptCd: string;
  deptNm: string;
  upDeptCd?: string | null;
}

export interface UpdateDeptRequest {
  deptNm: string;
  useYn?: string;
}

/** 평면 리스트를 트리 노드 구조로 변환하기 위한 타입 */
export interface DeptTreeNode extends Department {
  children: DeptTreeNode[];
}

/** 평면 리스트 → 트리 변환 유틸 */
export function buildTree(depts: Department[]): DeptTreeNode[] {
  const map = new Map<string, DeptTreeNode>();
  depts.forEach((d) => map.set(d.deptCd, { ...d, children: [] }));

  const roots: DeptTreeNode[] = [];
  map.forEach((node) => {
    if (node.upDeptCd && map.has(node.upDeptCd)) {
      map.get(node.upDeptCd)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

const deptApi = {
  getAll: (): Promise<Department[]> =>
    apiClient.get('/api/admin/departments').then((r) => r.data?.data ?? []),

  create: (data: CreateDeptRequest): Promise<Department> =>
    apiClient.post('/api/admin/departments', data).then((r) => r.data.data),

  update: (deptCd: string, data: UpdateDeptRequest): Promise<Department> =>
    apiClient.put(`/api/admin/departments/${deptCd}`, data).then((r) => r.data.data),

  disable: (deptCd: string): Promise<void> =>
    apiClient.delete(`/api/admin/departments/${deptCd}`).then(() => undefined),
};

export const useDepartments = () =>
  useQuery({
    queryKey: ['departments'],
    queryFn: deptApi.getAll,
  });

export const useCreateDept = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deptApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};

export const useUpdateDept = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deptCd, data }: { deptCd: string; data: UpdateDeptRequest }) =>
      deptApi.update(deptCd, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};

export const useDisableDept = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deptCd: string) => deptApi.disable(deptCd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};
