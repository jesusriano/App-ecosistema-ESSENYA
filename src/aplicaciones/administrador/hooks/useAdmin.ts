import { useEcosystem } from '../../../shared/context/EcosystemContext';

export const useAdmin = () => {
  const ecosystem = useEcosystem();

  return {
    services: ecosystem.services,
    therapists: ecosystem.therapists,
    clients: ecosystem.clients,
    bookings: ecosystem.bookings,
    invoices: ecosystem.invoices,
    zones: ecosystem.zones,
    auditLogs: ecosystem.auditLogs,
    activeInvoice: ecosystem.activeInvoice,
    setActiveInvoice: ecosystem.setActiveInvoice,
    handleUpdateBookingState: ecosystem.handleUpdateBookingState,
    handleAdminAcceptBooking: ecosystem.handleAdminAcceptBooking,
    handleAdminRejectBooking: ecosystem.handleAdminRejectBooking,
    handleReassignTherapist: ecosystem.handleReassignTherapist,
    handleToggleZoneSurge: ecosystem.handleToggleZoneSurge,
    handleAddTherapist: ecosystem.handleAddTherapist,
    handleEditTherapist: ecosystem.handleEditTherapist,
    handleDeleteTherapist: ecosystem.handleDeleteTherapist,
    handleAddZone: ecosystem.handleAddZone,
    handleEditZone: ecosystem.handleEditZone,
    handleDeleteZone: ecosystem.handleDeleteZone,
    handleAddService: ecosystem.handleAddService,
    handleEditService: ecosystem.handleEditService,
    handleDeleteService: ecosystem.handleDeleteService,
    handleAddClient: ecosystem.handleAddClient,
    handleEditClient: ecosystem.handleEditClient,
    handleToggleBlockClient: ecosystem.handleToggleBlockClient,
    handleRescheduleBooking: ecosystem.handleRescheduleBooking,
    handleCancelBooking: ecosystem.handleCancelBooking,
    handleConfirmPayment: ecosystem.handleConfirmPayment,
    handleRejectPayment: ecosystem.handleRejectPayment,
    panicAlerts: ecosystem.panicAlerts,
    activePanicAlertsCount: ecosystem.activePanicAlertsCount,
    handleResolvePanicAlert: ecosystem.handleResolvePanicAlert,
    handleAttendPanicAlert: ecosystem.handleAttendPanicAlert,
    activeBookingCount: ecosystem.activeBookingCount,
  };
};
