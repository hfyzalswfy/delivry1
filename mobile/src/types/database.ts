export type UserRole = 'customer' | 'driver' | 'store' | 'admin';
export type OrderStatus = 'pending' | 'published' | 'driver_accepted' | 'driver_arrived_store' | 'picked_up' | 'on_the_way' | 'driver_arrived_destination' | 'delivered' | 'cancelled';
export type DeliveryIssueType = 'customer_unavailable' | 'wrong_address' | 'customer_refused' | 'store_issue' | 'vehicle_issue' | 'emergency' | 'other';
export type NotificationType = 'order_update' | 'new_message' | 'driver_assignment' | 'nearby_order' | 'complaint_update' | 'system';
export type DriverAvailability = 'online' | 'offline' | 'busy';
export type PaymentMethod = 'cash' | 'card' | 'wallet';
export type OrderPriority = 'normal' | 'express';
export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'file' | 'location' | 'system';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export interface Profiles {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stores {
  id: string;
  owner_id: string;
  name: string;
  commercial_registration: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  landmark: string | null;
  building: string | null;
  notes: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddresses {
  id: string;
  customer_id: string;
  label: string | null;
  address_text: string;
  latitude: number;
  longitude: number;
  apartment: string | null;
  floor: string | null;
  landmark: string | null;
  notes: string | null;
  is_default: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customers {
  id: string;
  profile_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Drivers {
  id: string;
  profile_id: string;
  availability: DriverAvailability;
  current_latitude: number | null;
  current_longitude: number | null;
  location_updated_at: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  is_verified: boolean;
  is_active: boolean;
  average_rating: number;
  total_deliveries: number;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentTypes {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  max_weight_kg: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface DeliveryOrders {
  id: string;
  order_number: string;
  store_id: string;
  created_by: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_apartment: string | null;
  delivery_floor: string | null;
  delivery_landmark: string | null;
  delivery_notes: string | null;
  shipment_type_id: string | null;
  shipment_description: string | null;
  shipment_weight_kg: number | null;
  notes_for_driver: string | null;
  delivery_fee: number;
  platform_commission: number;
  driver_earnings: number;
  reward_bonus: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  priority: OrderPriority;
  assigned_driver_id: string | null;
  assigned_at: string | null;
  otp_code: string | null;
  otp_expires_at: string | null;
  otp_verified_at: string | null;
  proof_image_url: string | null;
  proof_signature_url: string | null;
  driver_arrived_destination_at: string | null;
  published_at: string | null;
  driver_accepted_at: string | null;
  driver_arrived_store_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrderAssignments {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  assigned_at: string;
  responded_at: string | null;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface DeliveryIssues {
  id: string;
  order_id: string;
  driver_id: string;
  issue_type: DeliveryIssueType;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface DriverLocations {
  id: string;
  driver_id: string;
  order_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
  created_at: string;
}

export interface Conversations {
  id: string;
  order_id: string;
  created_at: string;
}

export interface ConversationParticipants {
  id: string;
  conversation_id: string;
  profile_id: string;
  participant_role: UserRole;
  joined_at: string;
}

export interface Messages {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: MessageType;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Notifications {
  id: string;
  profile_id: string;
  notification_type: NotificationType | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface Wallets {
  id: string;
  profile_id: string;
  balance: number;
  currency: string;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactions {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface DriverDocuments {
  id: string;
  driver_id: string;
  document_type: string;
  document_url: string;
  status: DocumentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushTokens {
  id: string;
  profile_id: string;
  token: string;
  platform: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profiles; Insert: Partial<Profiles>; Update: Partial<Profiles> };
      stores: { Row: Stores; Insert: Partial<Stores>; Update: Partial<Stores> };
      customer_addresses: { Row: CustomerAddresses; Insert: Partial<CustomerAddresses>; Update: Partial<CustomerAddresses> };
      customers: { Row: Customers; Insert: Partial<Customers>; Update: Partial<Customers> };
      drivers: { Row: Drivers; Insert: Partial<Drivers>; Update: Partial<Drivers> };
      shipment_types: { Row: ShipmentTypes; Insert: Partial<ShipmentTypes>; Update: Partial<ShipmentTypes> };
      delivery_orders: { Row: DeliveryOrders; Insert: Partial<DeliveryOrders>; Update: Partial<DeliveryOrders> };
      order_assignments: { Row: OrderAssignments; Insert: Partial<OrderAssignments>; Update: Partial<OrderAssignments> };
      order_status_history: { Row: OrderStatusHistory; Insert: Partial<OrderStatusHistory>; Update: Partial<OrderStatusHistory> };
      delivery_issues: { Row: DeliveryIssues; Insert: Partial<DeliveryIssues>; Update: Partial<DeliveryIssues> };
      driver_documents: { Row: DriverDocuments; Insert: Partial<DriverDocuments>; Update: Partial<DriverDocuments> };
      driver_locations: { Row: DriverLocations; Insert: Partial<DriverLocations>; Update: Partial<DriverLocations> };
      conversations: { Row: Conversations; Insert: Partial<Conversations>; Update: Partial<Conversations> };
      conversation_participants: { Row: ConversationParticipants; Insert: Partial<ConversationParticipants>; Update: Partial<ConversationParticipants> };
      messages: { Row: Messages; Insert: Partial<Messages>; Update: Partial<Messages> };
      notifications: { Row: Notifications; Insert: Partial<Notifications>; Update: Partial<Notifications> };
      wallets: { Row: Wallets; Insert: Partial<Wallets>; Update: Partial<Wallets> };
      wallet_transactions: { Row: WalletTransactions; Insert: Partial<WalletTransactions>; Update: Partial<WalletTransactions> };
      push_tokens: { Row: PushTokens; Insert: Partial<PushTokens>; Update: Partial<PushTokens> };
    };
    Views: Record<string, never>;
    Functions: {
      user_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      add_wallet_transaction: { Args: { p_wallet_id: string; p_amount: number; p_type: string; p_description?: string; p_reference_type?: string; p_reference_id?: string }; Returns: string };
      find_customer_by_phone: { Args: { p_phone: string }; Returns: string };
      get_customer_info: { Args: { p_phone: string }; Returns: Record<string, unknown> };
      get_customer_addresses: { Args: { p_customer_id: string }; Returns: Record<string, unknown> };
      accept_order: { Args: { p_order_id: string; p_driver_id: string }; Returns: Record<string, unknown> };
      arrive_at_destination: { Args: { p_order_id: string; p_driver_id: string }; Returns: Record<string, unknown> };
      complete_delivery: { Args: { p_order_id: string; p_driver_id: string; p_verification_method: string; p_verification_data?: string }; Returns: Record<string, unknown> };
      report_delivery_issue: { Args: { p_order_id: string; p_driver_id: string; p_issue_type: DeliveryIssueType; p_description?: string }; Returns: Record<string, unknown> };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      driver_availability: DriverAvailability;
      payment_method: PaymentMethod;
      order_priority: OrderPriority;
      message_type: MessageType;
      notification_type: NotificationType;
      delivery_issue_type: DeliveryIssueType;
      document_status: DocumentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
