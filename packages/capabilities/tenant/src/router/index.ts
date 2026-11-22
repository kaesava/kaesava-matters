import {
  createTenantHandler,
  getTenantHandler,
  cancelSetupHandler,
  invitePartnerHandler,
  acceptInviteHandler,
  exportDataHandler,
  deleteMyAccountHandler,
} from "../index";

export const tenantProcedures = {
  createTenant: { execute: createTenantHandler },
  getTenant: { execute: getTenantHandler },
  cancelSetup: { execute: cancelSetupHandler },
  invitePartner: { execute: invitePartnerHandler },
  acceptInvite: { execute: acceptInviteHandler },
  exportData: { execute: exportDataHandler },
  deleteMyAccount: { execute: deleteMyAccountHandler },
} as const;
