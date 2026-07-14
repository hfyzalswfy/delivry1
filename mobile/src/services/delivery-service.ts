import { supabase } from '../lib/supabase';
import type { DeliveryIssueType } from '../types/database';

export type DeliveryResult =
  | { success: true; error: null }
  | { success: false; code: string; error: string };

export type IssueType = DeliveryIssueType;

/**
 * Atomic: Mark driver as arrived at destination.
 * Transitions status from on_the_way → driver_arrived_destination,
 * inserts order_status_history, all in one DB transaction.
 */
export async function arriveAtDestination(
  orderId: string,
  driverId: string,
): Promise<DeliveryResult> {
  const { data, error } = await supabase.rpc('arrive_at_destination', {
    p_order_id: orderId,
    p_driver_id: driverId,
  });

  if (error) {
    return { success: false, code: 'RPC_ERROR', error: error.message };
  }

  const result = data as unknown as DeliveryResult;
  return result;
}

export type VerificationMethod = 'otp' | 'photo' | 'signature' | 'none';

/**
 * Atomic: Complete delivery with optional verification.
 * Transitions status to delivered, updates OTP/signature/photo,
 * inserts order_status_history, increments driver stats, all in one DB transaction.
 */
export async function completeDelivery(
  orderId: string,
  driverId: string,
  verificationMethod: VerificationMethod = 'none',
  verificationData?: string,
): Promise<DeliveryResult> {
  const { data, error } = await supabase.rpc('complete_delivery', {
    p_order_id: orderId,
    p_driver_id: driverId,
    p_verification_method: verificationMethod,
    p_verification_data: verificationData ?? null,
  });

  if (error) {
    return { success: false, code: 'RPC_ERROR', error: error.message };
  }

  const result = data as unknown as DeliveryResult;
  return result;
}

/**
 * Atomic: Mark driver as arrived at store.
 * Transitions status from driver_accepted → driver_arrived_store,
 * inserts order_status_history, all in one DB transaction.
 */
export async function arriveAtStore(
  orderId: string,
  driverId: string,
): Promise<DeliveryResult> {
  const { data, error } = await supabase.rpc('arrive_at_store', {
    p_order_id: orderId,
    p_driver_id: driverId,
  });

  if (error) {
    return { success: false, code: 'RPC_ERROR', error: error.message };
  }

  const result = data as unknown as DeliveryResult;
  return result;
}

/**
 * Atomic: Confirm pickup at store.
 * Transitions status from driver_arrived_store → picked_up,
 * with optional proof image and notes.
 */
export async function confirmPickup(
  orderId: string,
  driverId: string,
  proofImageUrl?: string,
  notes?: string,
): Promise<DeliveryResult> {
  const { data, error } = await supabase.rpc('confirm_pickup', {
    p_order_id: orderId,
    p_driver_id: driverId,
    p_proof_image_url: proofImageUrl ?? null,
    p_notes: notes ?? null,
  });

  if (error) {
    return { success: false, code: 'RPC_ERROR', error: error.message };
  }

  const result = data as unknown as DeliveryResult;
  return result;
}

/**
 * Atomic: Start delivery (depart from store toward customer).
 * Transitions status from picked_up → on_the_way,
 * inserts order_status_history, all in one DB transaction.
 */
export async function startDelivery(
  orderId: string,
  driverId: string,
): Promise<DeliveryResult> {
  const { data, error } = await supabase.rpc('start_delivery', {
    p_order_id: orderId,
    p_driver_id: driverId,
  });

  if (error) {
    return { success: false, code: 'RPC_ERROR', error: error.message };
  }

  const result = data as unknown as DeliveryResult;
  return result;
}

export type ReportIssueResult =
  | { success: true; issue_id: string }
  | { success: false; code: string; error: string };

/**
 * Create a delivery issue record without changing order status.
 */
export async function reportDeliveryIssue(
  orderId: string,
  driverId: string,
  issueType: IssueType,
  description?: string,
): Promise<ReportIssueResult> {
  const { data, error } = await supabase.rpc('report_delivery_issue', {
    p_order_id: orderId,
    p_driver_id: driverId,
    p_issue_type: issueType,
    p_description: description ?? null,
  });

  if (error) {
    return { success: false, code: 'RPC_ERROR', error: error.message };
  }

  const result = data as unknown as ReportIssueResult;
  return result;
}
