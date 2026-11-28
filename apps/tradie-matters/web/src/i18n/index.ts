import { registerAppDictionary } from "@kaesava/i18n";
import { calendar } from "@kaesava/capability-calendar";
import { chat } from "@kaesava/capability-chat/i18n";
import { tradieSms, tradieSync } from "@tradie-matters/capability-integrations/i18n";
import {
  tradieCrm,
  tradieInvoices,
  tradieJobs,
  tradiePulse,
  tradieQuotes,
  tradieSetup,
} from "@tradie-matters/capability-operations/i18n";
import { tradieWeb } from "./tradieWeb";

registerAppDictionary(tradieWeb);
registerAppDictionary(tradieSetup);
registerAppDictionary(tradieCrm);
registerAppDictionary(tradieJobs);
registerAppDictionary(tradieQuotes);
registerAppDictionary(tradieInvoices);
registerAppDictionary(tradiePulse);
registerAppDictionary(calendar);
registerAppDictionary(chat);
registerAppDictionary(tradieSync);
registerAppDictionary(tradieSms);

export { tradieWeb };
