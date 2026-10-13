// Lightspeed API Types

export interface LightspeedConfig {
  accountId: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  environment?: 'trial' | 'production';
  apiType?: 'retail' | 'restaurant';
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
}

// Retail V3 cursor pagination: follow `next` until it is empty
export interface PaginatedResponse<T> {
  '@attributes': {
    next: string;
    previous: string;
  };
  data: T[];
}

// Core Lightspeed Retail Entities

export interface Item {
  itemID: number;
  systemSku: string;
  customSku?: string;
  manufacturerSku?: string;
  description: string;
  upc?: string;
  ean?: string;
  modelYear?: number;
  itemType: 'default' | 'assembly' | 'giftcard' | 'service';
  defaultCost: number;
  avgCost: number;
  tax: boolean;
  discountable: boolean;
  archived: boolean;
  serialized: boolean;
  publishToEcom: boolean;
  categoryID?: number;
  taxClassID?: number;
  manufacturerID?: number;
  defaultVendorID?: number;
  itemMatrixID?: number;
  createTime: string;
  timeStamp: string;
  Prices?: ItemPrice[];
  ItemShops?: ItemShop[];
  Tags?: ItemTag[];
}

export interface ItemPrice {
  itemID: number;
  useTypeID: number;
  amount: string;
  useType: string;
}

export interface ItemShop {
  itemShopID: number;
  itemID: number;
  shopID: number;
  qoh: number; // Quantity on hand
  backorder: number;
  reorderPoint: number;
  reorderLevel: number;
  timeStamp: string;
}

export interface ItemTag {
  itemID: number;
  tagName: string;
}

export interface Category {
  categoryID: number;
  name: string;
  parentID?: number;
  nodeDepth: string;
  fullPathName: string;
  leftNode: number;
  rightNode: number;
  createTime: string;
  timeStamp: string;
}

export interface Customer {
  customerID: number;
  firstName: string;
  lastName: string;
  title?: string;
  company?: string;
  dob?: string;
  archived: boolean;
  customerTypeID?: number;
  discountID?: number;
  taxCategoryID?: number;
  contactID?: number;
  creditAccountID?: number;
  createTime: string;
  timeStamp: string;
  Contact?: Contact;
  CreditAccount?: CreditAccount;
}

export interface Contact {
  contactID: number;
  noEmail: boolean;
  noPhone: boolean;
  noMail: boolean;
  websiteUrl?: string;
  phoneHome?: string;
  phoneWork?: string;
  phoneMobile?: string;
  phoneFax?: string;
  primaryEmail?: string;
  secondaryEmail?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  countryCode?: string;
  stateCode?: string;
}

export interface CreditAccount {
  creditAccountID: number;
  code: string;
  name: string;
  description?: string;
  creditLimit: number;
  balance: number;
  giftCard: boolean;
  archived: boolean;
  customerID: number;
  timeStamp: string;
}

export interface Sale {
  saleID: number;
  createTime: string;
  updateTime: string;
  completeTime?: string;
  completed: boolean;
  voided: boolean;
  archived: boolean;
  referenceNumber: string;
  referenceNumberSource?: string;
  discountPercent: number;
  tax1Rate: number;
  tax2Rate: number;
  calcDiscount: number;
  calcTotal: number;
  calcSubtotal: number;
  calcTaxable: number;
  calcNonTaxable: number;
  calcTax1: number;
  calcTax2: number;
  calcPayments: number;
  total: number;
  totalDue: number;
  balance: number;
  customerID?: number;
  discountID?: number;
  employeeID?: number;
  registerID?: number;
  shopID: number;
  taxCategoryID?: number;
  timeStamp: string;
  SaleLines?: SaleLine[];
  SalePayments?: SalePayment[];
}

export interface SaleLine {
  saleLineID: number;
  saleID: number;
  itemID: number;
  unitQuantity: number;
  unitPrice: number;
  normalUnitPrice: number;
  discountAmount: number;
  discountPercent: number;
  avgCost: number;
  fifoCost: number;
  tax: boolean;
  tax1Rate: number;
  tax2Rate: number;
  calcLineDiscount: number;
  calcTransactionDiscount: number;
  calcTotal: number;
  calcSubtotal: number;
  calcTax1: number;
  calcTax2: number;
  employeeID?: number;
  taxCategoryID?: number;
  createTime: string;
  timeStamp: string;
}

export interface SalePayment {
  salePaymentID: number;
  saleID: number;
  paymentTypeID: number;
  amount: number;
  archived: boolean;
  employeeID?: number;
  registerID?: number;
  createTime: string;
}

export interface Order {
  orderID: number;
  vendorID: number;
  shopID: number;
  orderedDate?: string;
  receivedDate?: string;
  arrivalDate?: string;
  archived: boolean;
  complete: boolean;
  discount: number;
  totalDiscount: number;
  totalQuantity: number;
  shipCost: number;
  otherCost: number;
  refNum?: string;
  shipInstructions?: string;
  stockInstructions?: string;
  timeStamp: string;
  OrderLines?: OrderLine[];
}

export interface OrderLine {
  orderLineID: number;
  orderID: number;
  itemID: number;
  quantity: number;
  price: number;
  originalPrice: number;
  numReceived: number;
  total: number;
  timeStamp: string;
}

export interface Vendor {
  vendorID: number;
  name: string;
  accountNumber?: string;
  archived: boolean;
  contactID?: number;
  priceLevel?: string;
  updatePrice: boolean;
  updateCost: boolean;
  updateDescription: boolean;
  timeStamp: string;
  Contact?: Contact;
}

export interface Employee {
  employeeID: number;
  firstName: string;
  lastName: string;
  archived: boolean;
  lockOut: boolean;
  employeeRoleID?: number;
  contactID?: number;
  limitToShopID?: number;
  lastShopID?: number;
  lastRegisterID?: number;
  timeStamp: string;
}

export interface Register {
  registerID: number;
  name: string;
  shopID: number;
  archived: boolean;
  open: boolean;
  openTime?: string;
  openEmployeeID?: number;
}

export interface Shop {
  shopID: number;
  name: string;
  archived: boolean;
  serviceRate: number;
  taxLabor: boolean;
  timeZone: string;
  contactID?: number;
  taxCategoryID?: number;
  timeStamp: string;
}

export interface Manufacturer {
  manufacturerID: number;
  name: string;
  createTime: string;
  timeStamp: string;
}

export interface InventoryCount {
  inventoryCountID: number;
  name: string;
  shopID: number;
  archived: boolean;
  timeStamp: string;
  InventoryCountItems?: InventoryCountItem[];
}

export interface InventoryCountItem {
  inventoryCountItemID: number;
  inventoryCountID: number;
  itemID: number;
  qty: number;
  employeeID?: number;
  timeStamp: string;
}

export interface InventoryTransfer {
  transferID: number;
  sendingShopID: number;
  receivingShopID: number;
  createdByEmployeeID?: number;
  sentByEmployeeID?: number;
  status: 'pending' | 'sent' | 'received' | 'cancelled';
  note?: string;
  sentOn?: string;
  needBy?: string;
  archived: boolean;
  createTime: string;
  timeStamp: string;
  TransferItems?: InventoryTransferItem[];
}

export interface InventoryTransferItem {
  transferItemID: number;
  transferID: number;
  itemID: number;
  toSend: number;
  toReceive: number;
  sent: number;
  received: number;
  sentValue: number;
  receivedValue: number;
  comment?: string;
  timeStamp: string;
}

export interface InventoryLog {
  inventoryLogID: number;
  itemID: number;
  shopID: number;
  employeeID?: number;
  qohChange: number;
  costChange: number;
  automated: boolean;
  causedNegative: boolean;
  reason?: string;
  createTime: string;
  saleID?: number;
  orderID?: number;
  transferID?: number;
}

export interface Workorder {
  workorderID: number;
  customerID: number;
  shopID: number;
  saleID?: number;
  saleLineID?: number;
  workorderStatusID?: number;
  archived: boolean;
  timeIn?: string;
  etaOut?: string;
  note?: string;
  warranty: boolean;
  tax: boolean;
  timeStamp: string;
  WorkorderItems?: WorkorderItem[];
}

export interface WorkorderItem {
  workorderItemID: number;
  workorderID: number;
  itemID: number;
  employeeID?: number;
  saleLineID?: number;
  approved: boolean;
  unitPrice: number;
  unitQuantity: number;
  warranty: boolean;
  tax: boolean;
  note?: string;
  timeStamp: string;
}

export interface Discount {
  discountID: number;
  name: string;
  discountAmount: number;
  discountPercent: number;
  requireCustomer: boolean;
  archived: boolean;
  createTime: string;
  timeStamp: string;
}

export interface TaxCategory {
  taxCategoryID: number;
  isTaxInclusive: boolean;
  tax1Name: string;
  tax2Name: string;
  tax1Rate: number;
  tax2Rate: number;
  timeStamp: string;
}

// Lightspeed Restaurant K-Series Types

export interface RestaurantMenu {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  sortOrder: number;
  categories: RestaurantCategory[];
}

export interface RestaurantCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  items: RestaurantMenuItem[];
}

export interface RestaurantMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  sortOrder: number;
  categoryId: string;
}

export interface RestaurantOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  total: number;
  subtotal: number;
  tax: number;
  gratuity?: number;
  createdAt: string;
  updatedAt: string;
  items: RestaurantOrderItem[];
}

export interface RestaurantOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  section?: string;
}

// Error handling
export interface LightspeedError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}
