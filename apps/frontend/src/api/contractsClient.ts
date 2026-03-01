import {
  Configuration,
  EventsApi,
  ProfileApi
} from "@contracts/client";

const apiBasePath = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const configuration = new Configuration({
  basePath: apiBasePath
});

export const profileApi = new ProfileApi(configuration);
export const eventsApi = new EventsApi(configuration);
