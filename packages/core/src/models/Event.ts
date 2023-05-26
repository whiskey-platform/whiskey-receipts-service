export interface Event {
  action: 'ADD' | 'DELETE';
  details: {
    id: string;
    timestamp: number;
    store: string;
    documentType: string;
    sourceBucket?: string;
    sourceKey?: string;
  };
  replay?: boolean;
}
