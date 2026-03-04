export interface ListConfig {
  key: string;
  label: string;
  endpoint: string;
  singularLabel: string;
  // Fields displayed in the table (beyond standard name, status, usage count)
  customFields?: {
    key: string;
    label: string;
    dataIndex: string;
  }[];
  // Fields in the create/edit form (beyond standard name)
  formFields?: {
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea';
    required?: boolean;
    placeholder?: string;
    rows?: number;
  }[];
  // How to calculate usage count - property name on response
  usageCountField?: string;
}

export interface ModuleConfig {
  key: string;
  label: string;
  lists: ListConfig[];
}

export const listRegistry: ModuleConfig[] = [
  {
    key: 'lksem',
    label: 'LKSEM',
    lists: [
      {
        key: 'accounttypes',
        label: 'Account Types',
        endpoint: '/lksem/accounttypes',
        singularLabel: 'Account Type',
        usageCountField: 'accountCount',
      },
      {
        key: 'accountowners',
        label: 'Account Owners',
        endpoint: '/lksem/accountowners',
        singularLabel: 'Account Owner',
        usageCountField: 'accountCount',
      },
    ],
  },
  {
    key: 'aviation',
    label: 'Aviation',
    lists: [
      {
        key: 'trainingtypes',
        label: 'Training Types',
        endpoint: '/aviation/trainingtypes',
        singularLabel: 'Training Type',
        usageCountField: 'trainingLogCount',
      },
      {
        key: 'aircraft',
        label: 'Aircraft',
        endpoint: '/aviation/aircraft',
        singularLabel: 'Aircraft',
        usageCountField: 'trainingLogCount',
        customFields: [
          { key: 'planeId', label: 'Plane ID', dataIndex: 'planeId' },
        ],
        formFields: [
          { name: 'planeId', label: 'Plane ID', type: 'text', required: true, placeholder: 'e.g., N12345' },
        ],
      },
      {
        key: 'documenttypes',
        label: 'Document Types',
        endpoint: '/aviation/documenttypes',
        singularLabel: 'Document Type',
        usageCountField: 'documentCount',
      },
      {
        key: 'aiprompts',
        label: 'AI Prompts',
        endpoint: '/aviation/aiprompts',
        singularLabel: 'AI Prompt',
        formFields: [
          { name: 'promptText', label: 'Prompt Text', type: 'textarea', required: true, rows: 8 },
        ],
      },
    ],
  },
];
