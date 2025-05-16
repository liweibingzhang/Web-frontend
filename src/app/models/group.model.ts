export interface Group {
  id: number;
  name: string;
  owner_id: number;
  description: string;
  created_at: string; // 或者 Date 类型，见说明
}
