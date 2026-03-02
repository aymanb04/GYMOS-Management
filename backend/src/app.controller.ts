import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Controller()
export class AppController {
  constructor(private supabaseService: SupabaseService) {}

  @Get('gyms')
  async getGyms() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase.from('gyms').select('*');
    if (error) return { error };
    return data;
  }

  @Get('classes')
  async getClasses() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase.from('classes').select('*');
    if (error) return { error };
    return data;
  }

  @Get('users')
  async getUsers() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase.from('users').select('*');
    if (error) return { error };
    return data;
  }

  @Get('payments')
  async getPayments() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase.from('payments').select('*');
    if (error) return { error };
    return data;
  }

  @Get('membership_plans')
  async getMembershipPlans() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase.from('membership_plans').select('*');
    if (error) return { error };
    return data;
  }

  @Get('reservations')
  async getReservations() {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase.from('reservations').select('*');
    if (error) return { error };
    return data;
  }
}