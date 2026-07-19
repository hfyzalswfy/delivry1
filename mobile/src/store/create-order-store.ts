import { create } from 'zustand';
import type { PaymentMethod, OrderPriority, CustomerAddresses } from '../types/database';

export type PickupOverrideSource = 'store' | 'current_location' | 'custom';

export interface CreateOrderState {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  isExistingCustomer: boolean;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupOverrideSource: PickupOverrideSource;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryApartment: string;
  deliveryFloor: string;
  deliveryLandmark: string;
  deliveryNotes: string;
  shipmentTypeId: string | null;
  shipmentDescription: string;
  shipmentWeightKg: string;
  deliveryFee: string;
  paymentMethod: PaymentMethod;
  priority: OrderPriority;
  notesForDriver: string;
  selectedAddress: CustomerAddresses | null;
  newlyAddedAddressId: string | null;

  setCustomer: (data: { id: string | null; name: string; phone: string; isExisting: boolean }) => void;
  setPickup: (data: { address: string; lat: number; lng: number; source?: PickupOverrideSource }) => void;
  setDelivery: (data: { address: string; lat: number; lng: number; apartment?: string; floor?: string; landmark?: string; notes?: string }) => void;
  setOrderDetails: (data: { shipmentTypeId?: string | null; description?: string; weightKg?: string; fee?: string; paymentMethod?: PaymentMethod; priority?: OrderPriority; notesForDriver?: string; deliveryNotes?: string }) => void;
  setSelectedAddress: (addr: CustomerAddresses | null) => void;
  setNewlyAddedAddressId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  customerId: null,
  customerName: '',
  customerPhone: '',
  isExistingCustomer: false,
  pickupAddress: '',
  pickupLat: null,
  pickupLng: null,
  pickupOverrideSource: 'store' as PickupOverrideSource,
  deliveryAddress: '',
  deliveryLat: null,
  deliveryLng: null,
  deliveryApartment: '',
  deliveryFloor: '',
  deliveryLandmark: '',
  deliveryNotes: '',
  shipmentTypeId: null,
  shipmentDescription: '',
  shipmentWeightKg: '',
  deliveryFee: '',
  paymentMethod: 'cash' as PaymentMethod,
  priority: 'normal' as OrderPriority,
  notesForDriver: '',
  selectedAddress: null,
  newlyAddedAddressId: null,
};

export const useCreateOrderStore = create<CreateOrderState>((set) => ({
  ...initialState,

  setCustomer: (data) => set({
    customerId: data.id,
    customerName: data.name,
    customerPhone: data.phone,
    isExistingCustomer: data.isExisting,
  }),

  setPickup: (data) => set({
    pickupAddress: data.address,
    pickupLat: data.lat,
    pickupLng: data.lng,
    pickupOverrideSource: data.source ?? 'store',
  }),

  setDelivery: (data) => set({
    deliveryAddress: data.address,
    deliveryLat: data.lat,
    deliveryLng: data.lng,
    deliveryApartment: data.apartment ?? '',
    deliveryFloor: data.floor ?? '',
    deliveryLandmark: data.landmark ?? '',
    deliveryNotes: data.notes ?? '',
  }),

  setOrderDetails: (data) => set((state) => ({
    shipmentTypeId: data.shipmentTypeId ?? state.shipmentTypeId,
    shipmentDescription: data.description ?? state.shipmentDescription,
    shipmentWeightKg: data.weightKg ?? state.shipmentWeightKg,
    deliveryFee: data.fee ?? state.deliveryFee,
    paymentMethod: data.paymentMethod ?? state.paymentMethod,
    priority: data.priority ?? state.priority,
    notesForDriver: data.notesForDriver ?? state.notesForDriver,
    deliveryNotes: data.deliveryNotes ?? state.deliveryNotes,
  })),

  setSelectedAddress: (addr) => set({ selectedAddress: addr }),
  setNewlyAddedAddressId: (id) => set({ newlyAddedAddressId: id }),

  reset: () => set(initialState),
}));
