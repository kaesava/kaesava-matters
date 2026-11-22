import {
  createTenantHandler,
  getTenantHandler,
  cancelSetupHandler,
  invitePartnerHandler,
  acceptInviteHandler,
  updateMemberRoleHandler,
  exportTenantDataHandler,
  deleteMyAccountHandler,
} from "../index";

export const tenantProcedures = {
  createTenant: { execute: createTenantHandler },
  getTenant: { execute: getTenantHandler },
  cancelSetup: { execute: cancelSetupHandler },
  invitePartner: { execute: invitePartnerHandler },
  acceptInvite: { execute: acceptInviteHandler },
  updateMemberRole: { execute: updateMemberRoleHandler },
  exportData: { execute: exportTenantDataHandler },
  deleteMyAccount: { execute: deleteMyAccountHandler },
} as const;
