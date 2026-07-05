import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Provides one shared Supabase client instance for the whole Angular app.
 *
 * Keeping the client here avoids creating multiple clients in different services
 * and keeps Supabase configuration in one place.
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
  );

  /** Returns the configured Supabase client for database calls. */
  get client(): SupabaseClient {
    return this.supabase;
  }
}
