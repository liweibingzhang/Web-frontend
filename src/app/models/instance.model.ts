export interface Instance {
  id?: number;
  component_id?: number;
  name: string;
  config: string; // Map<String, Object> 对应 TypeScript 的对象字典类型
  created_at?: string; // 或 Date
}
