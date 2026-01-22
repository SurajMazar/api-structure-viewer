
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface ParamItem {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

export interface ResponseMock {
  id: string;
  name: string;
  status: number;
  body: string;
}

export type BodyType = 'none' | 'json' | 'form-data' | 'raw';

export interface ApiItem {
  id: string;
  name: string;
  description: string;
  type: 'folder' | 'request';
  parentId: string | null;
  // Request specific
  method?: HttpMethod;
  url?: string;
  params?: ParamItem[];
  headers?: ParamItem[];
  // Body
  bodyType?: BodyType;
  bodyJson?: string;
  bodyRaw?: string;
  bodyFormData?: ParamItem[];
  // Responses
  mocks?: ResponseMock[];
  activeMockId?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  theme?: 'light' | 'dark';
  items: ApiItem[];
}

export interface AppState {
  collection: Collection;
  activeItemId: string | null;
}
