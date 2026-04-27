export interface Entry {
  author: string;
  created: string;
  score: number;
  device: string;
  color: string;
  country: string;
  batch: string;
  status: string;
  orderDate: string | null;
  confirmDate: string | null;
  shippingDate: string | null;
  body: string;
}

export interface Post {
  title: string;
  created: string | null;
  score: number;
  numComments: number;
}

export interface Filters {
  status: string;
  batch: string;
  device: string;
}

export interface SortState {
  column: string;
  asc: boolean;
}

export interface DataPayload {
  post: Post;
  entries: Entry[];
}
