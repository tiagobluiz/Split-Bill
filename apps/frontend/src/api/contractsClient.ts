import {
  Configuration,
  AuthApi,
  BalancesApi,
  EventsApi,
  PeopleApi,
  ProfileApi
} from "@contracts/client";
import { getAccessToken } from "../auth/sessionStore";

export const apiBasePath = import.meta.env.VITE_API_BASE_URL ?? "/api";

const configuration = new Configuration({
  basePath: apiBasePath,
  accessToken: () => getAccessToken() ?? ""
});

export const authApi = new AuthApi(configuration);
export const profileApi = new ProfileApi(configuration);
export const eventsApi = new EventsApi(configuration);
export const balancesApi = new BalancesApi(configuration);
export const peopleApi = new PeopleApi(configuration);
