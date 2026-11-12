export type DosageForm =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Suspension'
  | 'Injection'
  | 'Inhaler'
  | 'Drops'
  | 'Cream'
  | 'Suppository'
  | 'Powder';

export type ProductStatus =
  | 'Available'
  | 'Price Revised'
  | 'New Launch'
  | 'Limited Stock'
  | 'Discontinued';

export type UpdateSource =
  | 'Company Portal'
  | 'Online Feed Sync'
  | 'Webhook API'
  | 'Official Catalog';

export interface Generic {
  id: string;
  name: string;
  therapeuticClass: string;
  indications: string;
  pharmacology: string;
  dosage: string;
  contraindications: string;
  sideEffects: string;
  interactions: string;
  pregnancyCategory: string;
  precautions?: string;
  overdose?: string;
  storage: string;
}

export interface Company {
  id: string;
  name: string;
  shortName: string;
  country: string;
  website: string;
  feedUrl: string;
  syncMode: 'Auto Feed' | 'Webhook' | 'Portal';
  lastSyncedAt: string;
  verified: boolean;
  description: string;
}

export interface MedicineBrand {
  id: string;
  brandName: string;
  genericId: string;
  companyId: string;
  dosageForm: DosageForm;
  strength: string;
  unitPrice: number;
  previousUnitPrice?: number;
  packSize: string;
  packPrice: number;
  darNumber: string;
  status: ProductStatus;
  updatedAt: string;
  updateSource: UpdateSource;
}

export interface ProductUpdateLog {
  id: string;
  timestamp: string;
  companyId: string;
  companyName: string;
  brandId: string;
  brandName: string;
  genericName: string;
  changeType:
    | 'Price Updated'
    | 'New Product'
    | 'Stock Changed'
    | 'Spec Updated'
    | 'Feed Synced';
  summary: string;
  source: Exclude<UpdateSource, 'Official Catalog'>;
}

export interface CatalogState {
  version: number;
  lastUpdatedAt: string;
  companies: Company[];
  generics: Generic[];
  brands: MedicineBrand[];
  updates: ProductUpdateLog[];
}

export interface FeedProductItem {
  brandName: string;
  genericName: string;
  dosageForm: DosageForm;
  strength: string;
  unitPrice: number;
  packSize: string;
  packPrice: number;
  darNumber?: string;
  status?: ProductStatus;
}
