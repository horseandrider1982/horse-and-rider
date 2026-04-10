export type ConfiguratorFieldType =
  | 'text_input'
  | 'dropdown_single'
  | 'dropdown_multi'
  | 'image_single'
  | 'image_multi'
  | 'checkbox'
  | 'radio';

export interface ConfiguratorProduct {
  id: string;
  shopify_product_id: string;
  shopify_handle: string;
  title: string;
  featured_image_url: string | null;
  status: 'active' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ConfiguratorGroup {
  id: string;
  name: string;
  internal_name: string | null;
  description: string | null;
  field_type: ConfiguratorFieldType;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ConfiguratorGroupValue {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_delta: number;
  sku_hint: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ConfiguratorProductGroup {
  id: string;
  configurator_product_id: string;
  group_id: string;
  sort_order: number;
  is_required_override: boolean | null;
}

export interface ConfiguratorGroupWithValues extends ConfiguratorGroup {
  values: ConfiguratorGroupValue[];
}

export interface WizardSelection {
  groupId: string;
  type: ConfiguratorFieldType;
  // For single selects: single value id; for multi: array; for text: string; for checkbox: boolean
  value: string | string[] | boolean | null;
  priceDelta: number;
}

export interface ConfigurationState {
  isConfigured: boolean;
  selections: WizardSelection[];
  totalPriceDelta: number;
}

export const FIELD_TYPE_LABELS: Record<ConfiguratorFieldType, string> = {
  text_input: 'Texteingabe',
  dropdown_single: 'Dropdown (Einfach)',
  dropdown_multi: 'Dropdown (Mehrfach)',
  image_single: 'Bildauswahl (Einfach)',
  image_multi: 'Bildauswahl (Mehrfach)',
  checkbox: 'Checkbox',
  radio: 'Radiobutton',
};
