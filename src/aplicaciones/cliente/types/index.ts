import { ClientUser, Booking, ServiceItem, Therapist, Invoice } from '../../../shared/types/index';
import { ClientRoutePath } from '../components/ClientNavigation';

export type { ClientUser, Booking, ServiceItem as MassageService, Therapist as TherapistUser, Invoice, ClientRoutePath };

export interface PromoItem {
  id: string;
  title: string;
  code: string;
  discount: string;
  description: string;
  badge: string;
}
